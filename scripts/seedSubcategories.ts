import { db } from '@/lib/db';
import { subcategories } from '@/lib/migrations/schema';

// Helper function to generate URL-friendly slugs
function slugify(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[\s\W-]+/g, '-'); // Replace spaces and non-word chars with hyphen
}

// Your subcategory data (category, name, description)
const subcategoriesData = [
    // Stationary
    { category: 'Stationary', name: 'Letterhead', description: 'Professional custom letterhead for official correspondence and branding.' },
    { category: 'Stationary', name: 'Envelopes', description: 'Various types of envelopes including uncoated, self-adhesive, and security options.' },
    { category: 'Stationary', name: 'Notepads', description: 'Custom notepads available in multiple sizes and page counts for notes and reminders.' },
    { category: 'Stationary', name: 'NCR Forms', description: 'Multi-part NCR forms ideal for duplicate or triplicate copies for record-keeping.' },
    { category: 'Stationary', name: 'Supply Boxes', description: 'Durable brown corrugated supply boxes for shipping and storage needs.' },

    // Promotional
    { category: 'Promotional', name: 'Mugs', description: 'Wide range of custom mugs including ceramic and stainless steel options.' },
    { category: 'Promotional', name: 'Bottles', description: 'Stainless steel bottles perfect for promotional giveaways and personal use.' },
    { category: 'Promotional', name: 'Puzzles', description: 'Custom puzzles for promotional fun and engagement.' },
    { category: 'Promotional', name: 'Canvas', description: 'Stretched canvas prints for high-quality promotional art and branding.' },
    { category: 'Promotional', name: 'Tumblers', description: 'Custom tumblers for beverages, great for gifts and branding.' },
    { category: 'Promotional', name: 'Mason Jars', description: 'Clear and frosted mason jars for unique promotional items.' },
    { category: 'Promotional', name: 'Keychains', description: 'Pack of 10 custom keychains for memorable promotional giveaways.' },
    { category: 'Promotional', name: 'Coasters', description: 'Pack of 10 coasters customized with your branding.' },
    { category: 'Promotional', name: 'Mouse Pads', description: 'Custom mouse pads perfect for office branding and gifts.' },
    { category: 'Promotional', name: 'Photo Panels', description: 'High-definition photo panels for impactful promotional displays.' },

    // Labels and Packaging
    { category: 'Labels and Packaging', name: 'Labels', description: 'Wide variety of labels including premium BOPP, durable poly, and cost-effective paper labels.' },
    { category: 'Labels and Packaging', name: 'Product Boxes', description: 'Custom product boxes including straight tuck, reverse tuck, auto-lock bottom, and sleeves.' },
    { category: 'Labels and Packaging', name: 'Corrugated Boxes', description: 'Mailer boxes made from sturdy corrugated material for safe shipping.' },
    { category: 'Labels and Packaging', name: 'Flexible Packaging', description: 'Versatile packaging options including stand-up pouches, lay flat pouches, and roll stock.' },
    { category: 'Labels and Packaging', name: 'Cut To Shape Decal', description: 'Custom white vinyl decals available in permanent or removable adhesives.' },

    // Apparel
    { category: 'Apparel', name: "Men's Clothing", description: 'Wide range of men’s clothing including t-shirts, sweatshirts, hoodies, and embroidered polos.' },
    { category: 'Apparel', name: "Women's Clothing", description: 'Custom women’s clothing options including t-shirts, long sleeves, tank tops, and embroidered polos.' },
    { category: 'Apparel', name: 'Kids & Youth Clothing', description: 'Clothing for kids and youth featuring t-shirts, hoodies, sweatshirts, and more.' },
    { category: 'Apparel', name: 'Headwear', description: 'Embroidered hats and beanies for promotional and casual wear.' },
    { category: 'Apparel', name: 'Accessories', description: 'Tote bags and other apparel accessories for branding and giveaways.' },

    // Business Cards
    { category: 'Business Cards', name: 'Standard', description: 'Standard business cards with a variety of finishes including matte, UV, and writable options.' },
    { category: 'Business Cards', name: 'Specialty', description: 'Specialty business cards featuring metallic foil, spot UV, die cut, soft touch, and other premium finishes.' },

    // Sample Kits
    { category: 'Sample Kits', name: 'Stocks and Finishes', description: 'Sample kits showcasing available stocks and finishes for your print projects.' },
    { category: 'Sample Kits', name: 'Standard Sample Kit', description: 'A standard kit containing samples of popular print products.' },
    { category: 'Sample Kits', name: 'Large Format Sample Kit', description: 'Sample kit highlighting large format print options and materials.' },
    { category: 'Sample Kits', name: 'Roll Label Sample Kit', description: 'Sample kit featuring roll label materials and finishes.' },
    { category: 'Sample Kits', name: 'Specialty Sample Kit', description: 'Specialty kits showcasing unique and premium print samples.' },
];

// Add the slug field here
const subcategoriesWithSlugs = subcategoriesData.map((item) => ({
    ...item,
    slug: slugify(item.name),
}));

// Main seeding function
async function seedSubcategories() {
    try {
        await db.insert(subcategories).values(subcategoriesWithSlugs);
        console.log(`Successfully inserted ${subcategoriesWithSlugs.length} subcategories.`);
    } catch (err) {
        console.error('Failed to seed subcategories:', err);
    } finally {
        process.exit();
    }
}

// Run the seeder
seedSubcategories();
