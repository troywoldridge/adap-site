import { relations } from "drizzle-orm/relations";
import { products, optionsGroups, productVariants, categories, subcategories, images } from "./schema";

export const optionsGroupsRelations = relations(optionsGroups, ({one}) => ({
	product: one(products, {
		fields: [optionsGroups.productId],
		references: [products.id]
	}),
}));

export const productsRelations = relations(products, ({many}) => ({
	optionsGroups: many(optionsGroups),
	productVariants: many(productVariants),
	images: many(images),
}));

export const productVariantsRelations = relations(productVariants, ({one}) => ({
	product: one(products, {
		fields: [productVariants.productId],
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
	images_categoryId: many(images, {
		relationName: "images_categoryId_categories_id"
	}),
	images_categoryIdSlug: many(images, {
		relationName: "images_categoryIdSlug_categories_id"
	}),
}));

export const imagesRelations = relations(images, ({one}) => ({
	product: one(products, {
		fields: [images.productId],
		references: [products.id]
	}),
	category_categoryId: one(categories, {
		fields: [images.categoryId],
		references: [categories.id],
		relationName: "images_categoryId_categories_id"
	}),
	subcategory: one(subcategories, {
		fields: [images.subcategoryId],
		references: [subcategories.id]
	}),
	category_categoryIdSlug: one(categories, {
		fields: [images.categoryIdSlug],
		references: [categories.id],
		relationName: "images_categoryIdSlug_categories_id"
	}),
}));