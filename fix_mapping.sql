-- 1. Create a working temp table for slug normalization / overrides
DROP TABLE IF EXISTS temp_slug_map;
CREATE TEMP TABLE temp_slug_map (
  product_slug text,
  subcategory_slug text,
  reason text
);

-- 2. Populate temp_slug_map with obvious direct mappings for any known discrepancies.
-- You can add more rows here manually if some product slugs don't exactly equal subcategory slugs.
-- Example: (adjust or extend as needed)
INSERT INTO temp_slug_map (product_slug, subcategory_slug, reason) VALUES
  ('business-cards-18pt-matte-lam-spot-uv', 'specialty-business-cards-2', 'specialty business card variant'),
  ('business-cards-18pt-writable-c1s', 'specialty-business-cards-2', 'writable specialty card'),
  ('wall-calendars-100lb-gloss-text', 'wall-calendars-5', 'wall calendars variant'),
  ('wall-calendars-80lb-gloss-text', 'wall-calendars-5', 'wall calendars variant');

-- 3. (Optional) Import a full mapping CSV if you have one with columns product_slug, subcategory_slug
-- from the client shell, e.g.:
-- \copy temp_slug_map(product_slug, subcategory_slug, reason) FROM 'your_local_mapping.csv' WITH CSV HEADER

-- 4. Update products.subcategory_id via exact slug match
WITH direct_match AS (
  SELECT p.id AS product_id, sub.id AS subcat_id
  FROM products p
  JOIN subcategories sub ON p.slug = sub.slug
  WHERE p.subcategory_id IS DISTINCT FROM sub.id OR p.subcategory_id IS NULL
),
mapped_match AS (
  SELECT p.id AS product_id, sub.id AS subcat_id, m.reason
  FROM products p
  JOIN temp_slug_map m ON p.slug = m.product_slug
  JOIN subcategories sub ON sub.slug = m.subcategory_slug
  WHERE p.subcategory_id IS DISTINCT FROM sub.id OR p.subcategory_id IS NULL
)
-- 5. Apply updates from direct_match first
UPDATE products
SET subcategory_id = direct_match.subcat_id
FROM direct_match
WHERE products.id = direct_match.product_id;

-- 6. Then apply mapped_match overrides
UPDATE products
SET subcategory_id = mapped_match.subcat_id
FROM mapped_match
WHERE products.id = mapped_match.product_id;

-- 7. Report what still has no subcategory_id
SELECT
  p.id,
  p.slug,
  p.category,
  p.name
FROM products p
WHERE p.subcategory_id IS NULL
ORDER BY p.id
LIMIT 200;

-- 8. Optionally: list products whose slug does not correspond to any subcategory slug or mapping
WITH possible AS (
  SELECT p.id, p.slug
  FROM products p
  LEFT JOIN subcategories sub ON p.slug = sub.slug
  LEFT JOIN temp_slug_map m ON p.slug = m.product_slug
  WHERE sub.id IS NULL AND m.product_slug IS NULL
)
SELECT * FROM possible ORDER BY id LIMIT 200;
