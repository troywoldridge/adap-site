import { relations } from "drizzle-orm/relations";
import { products, optionsGroups, options, pricing, productVariants } from "./schema";

export const optionsGroupsRelations = relations(optionsGroups, ({one, many}) => ({
	product: one(products, {
		fields: [optionsGroups.productId],
		references: [products.id]
	}),
	options: many(options),
}));

export const productsRelations = relations(products, ({many}) => ({
	optionsGroups: many(optionsGroups),
	pricings: many(pricing),
	productVariants: many(productVariants),
}));

export const optionsRelations = relations(options, ({one}) => ({
	optionsGroup: one(optionsGroups, {
		fields: [options.groupId],
		references: [optionsGroups.id]
	}),
}));

export const pricingRelations = relations(pricing, ({one}) => ({
	product: one(products, {
		fields: [pricing.productId],
		references: [products.id]
	}),
}));

export const productVariantsRelations = relations(productVariants, ({one}) => ({
	product: one(products, {
		fields: [productVariants.productId],
		references: [products.id]
	}),
}));