import psycopg2
from psycopg2.extras import execute_values
import uuid
import re
from dotenv import load_dotenv
import os

load_dotenv()

# Your category-subcategory structure:
categories_structure = {
    "Print Products": {
        "Booklet": [
            "80lb Gloss Text (8.5 x 5.5)SALE", "80lb Gloss Text (8.5 x 11)SALE",
            "100lb Gloss Text (8.5 x 5.5)", "100lb Gloss Text (8.5 x 11)",
            "60lb Offset Text (8.5 x 5.5)", "60lb Offset Text (8.5 x 11)",
            "80lb Silk Text (8.5 x 5.5)", "80lb Silk Text (8.5 x 11)",
            "100lb Silk Text (8.5 x 5.5)", "100lb Silk Text (8.5 x 11)"
        ],
        "Magnets": [
            "Magnets (14pt)", "Car Magnets (30mil)",
            "Cut to Shape Magnets (30mil)", "Cut to Shape Magnets (20Mil)"
        ],
        "Greeting Cards": [
            "14pt + Matte Finish", "14pt + UV (High Gloss)", "14pt Writable + UV (C1S)",
            "13pt Enviro Uncoated", "14pt + AQ", "14pt Writable + AQ (C1S)",
            "Specialty", "Metallic Foil", "Kraft Paper", "Spot UV", "Pearl Paper"
        ],
        "Invitations / Announcements": [
            "14pt Matte Finish", "14pt Writable + AQ (C1S)", "14pt AQ", "14pt UV",
            "Kraft Paper", "Pearl Paper", "Metallic Foil"
        ],
        "Numbered Tickets": ["14pt tickets"],
        "Wall Calendars": ["80lb Gloss TextSALE", "100lb Gloss Text"],
        "Variable Printing": ["14pt Variable Printing"],
        "Posters": [
            "100lb Gloss Text", "100lb + Matte Finish", "100lb + UV (High Gloss)",
            "80lb Enviro Uncoated", "8pt C2S"
        ],
        "Door Hangers": [
            "14pt + Matte Finish", "14pt + UV (High Gloss)",
            "13pt Enviro Uncoated", "14pt + AQ"
        ],
        "Digital Sheets": [
            "14pt + Matte Finish", "13pt Enviro Uncoated",
            "100lb Gloss Text", "100lb + Matte Finish", "80lb Enviro Uncoated"
        ],
        "Folded Business Cards": [
            "14pt + Matte Finish", "14pt + UV (High Gloss)", "13pt Enviro Uncoated"
        ],
        "Tent Cards": ["14pt + Matte Finish"],
        "Plastics": ["14pt Plastic"],
        "Tear Cards": [
            "14pt + Matte Finish", "14pt + UV (High Gloss)", "13pt Enviro Uncoated"
        ],
        "Clings": ["Transparent Clings", "White Opaque Clings"]
    },
    "Stationary": {
        "Letterhead": ["Letterhead"],
        "Envelopes": [
            "60lb Uncoated", "Self-Adhesive 60lb Uncoated", "Security 60lb Uncoated"
        ],
        "Notepads": ["60lb Uncoated 25pgs", "60lb Uncoated 50pgs"],
        "NCR Forms": ["3 Part NCR Forms"],
        "Supply Boxes": ["Brown Corrugated"]
    },
    "Promotional": {
        "Mugs": [
            "11oz Ceramic Mug", "15oz Ceramic Mug", "12oz Stainless Steel Mug",
            "16oz Frosted Beer Mug", "18 oz Clear Beer Mug"
        ],
        "Bottles": ["17oz Stainless Steel Bottle"],
        "Puzzles": ["Puzzles"],
        "Canvas": ["Stretched Canvas Prints"],
        "Tumblers": ["20oz Tumbler"],
        "Mason Jars": ["12oz Clear Mason Jars", "12oz Frosted Mason Jars"],
        "Keychains": ["Keychains (Pack of 10)"],
        "Coasters": ["Coasters (Pack of 10)"],
        "Mouse Pads": ["Mouse Pad"],
        "Photo Panels": ["HD Photo Panel"]
    },
    "Labels and Packaging": {
        "Labels": [
            "BOPP Labels (Premium)", "Poly Labels (Durable)",
            "Paper Labels (Most Cost Effective)", "Square Cut Labels"
        ],
        "Product Boxes": [
            "Straight tuck end product box (STE)", "Reverse tuck end product box (RTE)",
            "Auto-lock bottom product box", "Product box Sleeves"
        ],
        "Corrugated Boxes": ["Mailer Boxes"],
        "Flexible Packaging": ["Stand Up Pouches", "Lay Flat Pouches", "Roll Stock"],
        "Cut To Shape Decal": ["White Vinyl (Permanent)", "White Vinyl (Removable)"]
    },
    "Apparel": {
        "Men's Clothing": [
            "T-Shirts", "Long Sleeve Shirts", "Sweatshirts",
            "Hoodies", "Tank Tops", "Embroidered Polos"
        ],
        "Women's Clothing": [
            "T-Shirts", "Long Sleeve Shirts", "Tank Tops", "Embroidered Polos"
        ],
        "Kids & Youth Clothing": [
            "T-Shirts", "Long Sleeve Shirts", "Sweatshirts", "Hoodies"
        ],
        "Headwear": ["Embroidered Hats", "Embroidered Beanies"],
        "Accessories": ["Tote Bags"]
    },
    "Business Cards": {
        "Standard": [
            "Quick Ship Business Cards", "14pt (Profit Maximizer)", "14pt + Matte Finish",
            "16pt + Matte Finish", "14pt + UV (High Gloss)", "16pt + UV (High Gloss)",
            "18pt Gloss Lamination", "18pt Matte / Silk Lamination", "14pt + AQ",
            "16pt + AQ", "18PT Writable (C1S)", "13pt Enviro Uncoated", "13pt Linen Uncoated",
            "14pt Writable + AQ (C1S)", "14pt Writable + UV (C1S)"
        ],
        "Specialty": [
            "Metallic Foil (Raised)", "Kraft Paper", "Durable", "Spot UV (Raised)",
            "Pearl Paper", "Die Cut", "Soft Touch (Suede)", "32pt Painted Edge", "Ultra Smooth"
        ]
    },
    "Sample Kits": {
        "SampleKits": [
            "Stocks and Finishes", "Standard Sample Kit", "Large Format Sample Kit",
            "Roll Label Sample Kit", "Specialty Sample Kit"
        ]
    },
    "Large Format": {
        "Coroplast Signs & Yard Signs": [
            "4mm Coroplast (Yard signs)", "6mm Coroplast", "8mm Coroplast", "10mm Coroplast"
        ],
        "Floor Graphics": [
            "4mm Foam Board", "Floor Graphics", "Social Distancing Floor Graphics"
        ],
        "Foam Board": ["4mm Foam Board"],
        "Aluminum Signs": ["3mm Aluminum Signs"],
        "Banners": ["13oz Glossy Vinyl", "13oz Matte Vinyl", "8oz Polyester Mesh"],
        "Pull Up Banners": [
            "13oz Matte Vinyl - Silver Base", "13oz Matte Vinyl - Black Base",
            "Premium Stand 13oz Matte Vinyl", "Table Top 13oz Matte Vinyl",
            "Premium Wide 13oz Matte Vinyl", "Double Sided 13oz Matte Vinyl"
        ],
        "Car Magnets": ["Car Magnets (30mil)"],
        "Table Covers": ["Table Covers (6 ft Table)", "Table Covers (8 ft Table)"],
        "Adhesive Vinyl": ["Glossy Adhesive Vinyl"],
        "Window Graphics": ["Perforated Vinyl"],
        "Large Format Posters": ["8pt C2S"],
        "Styrene Signs": ["20pt Styrene"],
        "Display Board / POP": ["24pt Display Board", "40pt Display Board"],
        "Canvas": ["Canvas Roll", "Stretched Canvas Prints"],
        "Sintra / PVC": ["3mm PVC"],
        "X-Frame Banners": ["13oz Matte Vinyl"],
        "A-Frame Signs": ["4mm Coroplast"],
        "Wall Decals": ["7 mil Removable Wall Decal"],
        "A Frame Stands": ["A Frame stands"],
        "H Stands for Signs": ["H Stands"]
    }
}

def slugify(text):
    text = text.lower()
    text = re.sub(r'[^a-z0-9]+', '-', text)
    return text.strip('-')

def main():
    conn = psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )
    cur = conn.cursor()

    # Insert categories
    for category_name, subcats in categories_structure.items():
        cat_slug = slugify(category_name)
        cat_id = cat_slug  # Using slug as ID for categories

        # Upsert category
        cur.execute("""
            INSERT INTO public.categories (id, slug, name)
            VALUES (%s, %s, %s)
            ON CONFLICT (id) DO NOTHING
        """, (cat_id, cat_slug, category_name))

        # Insert subcategories
        for subcat_name in subcats.keys():
            subcat_slug = slugify(subcat_name)
            # Check if subcategory exists
            cur.execute("""
                SELECT id FROM public.subcategories
                WHERE slug = %s AND category_id = %s
            """, (subcat_slug, cat_id))
            exists = cur.fetchone()
            if exists:
                continue
            # Insert new subcategory
            cur.execute("""
                INSERT INTO public.subcategories (category_id, slug, name)
                VALUES (%s, %s, %s)
            """, (cat_id, subcat_slug, subcat_name))

    conn.commit()
    cur.close()
    conn.close()
    print("✅ Categories and subcategories seeded successfully.")

if __name__ == "__main__":
    main()
