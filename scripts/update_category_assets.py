import os
import psycopg2
import re
from dotenv import load_dotenv

# --- 1. Read .env for DB config ---
load_dotenv()
db_config = dict(
    dbname=os.environ.get("PGDATABASE", ""),
    user=os.environ.get("PGUSER", ""),
    password=os.environ.get("PGPASSWORD", ""),
    host=os.environ.get("PGHOST", "localhost"),
    port=os.environ.get("PGPORT", 5432),
)

# --- 2. Paths ---
ASSET_FILE = os.path.abspath("src/lib/categoryAssets.ts")
BACKUP_FILE = ASSET_FILE + ".bak"

# --- 3. Helper: Parse the existing TS file for existing asset dicts ---
def parse_assets(ts_content, asset_name):
    """
    Extracts the JS asset dict as a Python dict: asset_name = { ... }
    """
    m = re.search(
        rf"export const {asset_name}:\s*Record<string, .+?>\s*=\s*{{(.*?)}};",
        ts_content,
        re.DOTALL,
    )
    if not m:
        print(f"Could not find {asset_name} in {ASSET_FILE}")
        return {}

    asset_dict = {}
    block = m.group(1)
    entries = re.findall(r'"([^"]+)":\s*{(.*?)}', block, re.DOTALL)
    for slug, body in entries:
        # Find fields by regex
        fields = dict(re.findall(r'(\w+):\s*"(.*?)"', body))
        asset_dict[slug] = fields
    return asset_dict

# --- 4. Helper: Render asset dict back to nice TS ---
def render_assets(asset_name, d, fields):
    out = [f"export const {asset_name}: Record<string, {asset_name[:-1].capitalize()}Asset> = {{"]
    for slug in sorted(d):
        entry = d[slug]
        out.append(f'  "{slug}": {{')
        for field in fields:
            v = entry.get(field, "")
            if v:
                out.append(f'    {field}: "{v}",')
        out.append("  },")
    out.append("};")
    return "\n".join(out)

def main():
    # --- 5. Fetch good slugs from DB ---
    conn = psycopg2.connect(**db_config)
    cur = conn.cursor()
    cur.execute("SELECT slug FROM categories ORDER BY slug")
    db_cats = set(row[0] for row in cur.fetchall())
    cur.execute("SELECT slug FROM subcategories ORDER BY slug")
    db_subcats = set(row[0] for row in cur.fetchall())
    conn.close()

    # --- 6. Read and parse existing assets file ---
    with open(ASSET_FILE, "r", encoding="utf8") as f:
        ts_content = f.read()
    cat_assets = parse_assets(ts_content, "CATEGORY_ASSETS")
    subcat_assets = parse_assets(ts_content, "SUBCATEGORY_ASSETS")

    # --- 7. Add missing slugs as empty/skeleton, remove extras ---
    # (You can set better TODO defaults here if you want)
    for slug in db_cats:
        if slug not in cat_assets:
            cat_assets[slug] = dict(
                imageId="", variant="public", imageUrl="/images/todo.jpg", description="TODO: add description."
            )
    for slug in db_subcats:
        if slug not in subcat_assets:
            subcat_assets[slug] = dict(
                imageId="", variant="public", imageUrl="/images/todo.jpg", description="TODO: add description."
            )
    # Remove any not in DB:
    cat_assets = {k: v for k, v in cat_assets.items() if k in db_cats}
    subcat_assets = {k: v for k, v in subcat_assets.items() if k in db_subcats}

    # --- 8. Write back out (with backup!) ---
    import shutil
    shutil.copyfile(ASSET_FILE, BACKUP_FILE)
    print(f"Backed up old file to {BACKUP_FILE}")

    fields_cat = ["imageId", "variant", "imageUrl", "description"]
    fields_subcat = ["imageId", "variant", "imageUrl", "description"]

    # Put it all back together
    parts = []
    # Copy everything up to the CATEGORY_ASSETS export
    cat_match = re.search(r"(^.*?)(export const CATEGORY_ASSETS)", ts_content, re.DOTALL)
    if cat_match:
        parts.append(cat_match.group(1))
    parts.append(render_assets("CATEGORY_ASSETS", cat_assets, fields_cat))
    # Copy everything between CATEGORY_ASSETS and SUBCATEGORY_ASSETS
    subcat_match = re.search(r"(};\s*// lib/categoryAssets.ts.*?)(export const SUBCATEGORY_ASSETS)", ts_content, re.DOTALL)
    if subcat_match:
        parts.append(subcat_match.group(1))
    parts.append(render_assets("SUBCATEGORY_ASSETS", subcat_assets, fields_subcat))
    # Optionally copy everything after SUBCATEGORY_ASSETS (e.g. helper functions)
    subcat_end = re.search(r"export const SUBCATEGORY_ASSETS[^{]+{.*?};(\s*// --- Helper functions.*)", ts_content, re.DOTALL)
    if subcat_end:
        parts.append(subcat_end.group(1))

    new_content = "\n\n".join(parts)
    with open(ASSET_FILE, "w", encoding="utf8") as f:
        f.write(new_content)

    print(f"Updated {ASSET_FILE} with slugs from DB.")

if __name__ == "__main__":
    main()
