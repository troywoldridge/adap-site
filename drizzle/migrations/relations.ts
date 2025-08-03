import { relations } from "drizzle-orm/relations";
import { products, optionsGroups, productOptionHashes, pricing, categories, subcategories, options, images } from "./schema";

export const optionsGroupsRelations = relations(optionsGroups, ({one}) => ({
	product: one(products, {
		fields: [optionsGroups.productId],
		references: [products.id]
	}),
}));

export const productsRelations = relations(products, ({many}) => ({
	optionsGroups: many(optionsGroups),
	productOptionHashes: many(productOptionHashes),
	options: many(options),
	pricings: many(pricing),
	images: many(images),
}));

export const productOptionHashesRelations = relations(productOptionHashes, ({one}) => ({
	product: one(products, {
		fields: [productOptionHashes.productId],
		references: [products.id]
	}),
	pricing: one(pricing, {
		fields: [productOptionHashes.pricingId],
		references: [pricing.id]
	}),
}));

export const pricingRelations = relations(pricing, ({one, many}) => ({
	productOptionHashes: many(productOptionHashes),
	product: one(products, {
		fields: [pricing.productId],
		references: [products.id]
	}),
}));

export const subcategoriesRelations = relations(subcategories, ({one, many}) => ({
	category: one(categories, {
		fields: [subcategories.categoryId],
		references: [categories.id]
	}),
	images: many(images),
}));

export const categoriesRelations = relations(categories, ({many}) => ({
	subcategories: many(subcategories),
	images: many(images),
}));

export const optionsRelations = relations(options, ({one}) => ({
	product: one(products, {
		fields: [options.productId],
		references: [products.id]
	}),
}));

export const imagesRelations = relations(images, ({one}) => ({
	product: one(products, {
		fields: [images.productId],
		references: [products.id]
	}),
	category: one(categories, {
		fields: [images.categoryId],
		references: [categories.id]
	}),
	subcategory: one(subcategories, {
		fields: [images.subcategoryId],
		references: [subcategories.id]
	}),
}));