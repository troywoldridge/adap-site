import { relations } from "drizzle-orm/relations";
import { products, optionsGroups, productVariants, categories, subcategories } from "./schema";

export const optionsGroupsRelations = relations(optionsGroups, ({one}) => ({
	product: one(products, {
		fields: [optionsGroups.productId],
		references: [products.id]
	}),
}));

export const productsRelations = relations(products, ({many}) => ({
	optionsGroups: many(optionsGroups),
	productVariants: many(productVariants),
}));

export const productVariantsRelations = relations(productVariants, ({one}) => ({
	product: one(products, {
		fields: [productVariants.productId],
		references: [products.id]
	}),
}));

export const subcategoriesRelations = relations(subcategories, ({one}) => ({
	category: one(categories, {
		fields: [subcategories.categoryId],
		references: [categories.id]
	}),
}));

export const categoriesRelations = relations(categories, ({many}) => ({
	subcategories: many(subcategories),
}));