import { relations } from "drizzle-orm/relations";
import { products, priceCache, customers, orders, customerAddresses, cartLines, cartArtwork, carts, orderItems, orderArtwork, productOptionGroups, shippingCache, productCombinationValues, sinaProducts, sinaOptionGroups, sinaOptions, sinaPricingMeta, loyaltyWallets, productOptions, loyaltyTransactions, productMeta, productOptionValues, productPricingMeta, pricingMetrics } from "./schema";

export const priceCacheRelations = relations(priceCache, ({one}) => ({
	product: one(products, {
		fields: [priceCache.productId],
		references: [products.id]
	}),
}));

export const productsRelations = relations(products, ({many}) => ({
	priceCaches: many(priceCache),
	productOptionGroups_productId: many(productOptionGroups, {
		relationName: "productOptionGroups_productId_products_id"
	}),
	productOptionGroups_productId: many(productOptionGroups, {
		relationName: "productOptionGroups_productId_products_id"
	}),
	shippingCaches: many(shippingCache),
	productCombinationValues: many(productCombinationValues),
	productOptions_productId: many(productOptions, {
		relationName: "productOptions_productId_products_id"
	}),
	productOptions_productId: many(productOptions, {
		relationName: "productOptions_productId_products_id"
	}),
	productMetas: many(productMeta),
	productOptionValues: many(productOptionValues),
	productPricingMetas: many(productPricingMeta),
	pricingMetrics: many(pricingMetrics),
}));

export const ordersRelations = relations(orders, ({one, many}) => ({
	customer: one(customers, {
		fields: [orders.customerId],
		references: [customers.id]
	}),
	customerAddress_billingAddressId: one(customerAddresses, {
		fields: [orders.billingAddressId],
		references: [customerAddresses.id],
		relationName: "orders_billingAddressId_customerAddresses_id"
	}),
	customerAddress_shippingAddressId: one(customerAddresses, {
		fields: [orders.shippingAddressId],
		references: [customerAddresses.id],
		relationName: "orders_shippingAddressId_customerAddresses_id"
	}),
	orderItems: many(orderItems),
	orderArtworks: many(orderArtwork),
	loyaltyTransactions: many(loyaltyTransactions),
}));

export const customersRelations = relations(customers, ({many}) => ({
	orders: many(orders),
	loyaltyWallets: many(loyaltyWallets),
	customerAddresses: many(customerAddresses),
}));

export const customerAddressesRelations = relations(customerAddresses, ({one, many}) => ({
	orders_billingAddressId: many(orders, {
		relationName: "orders_billingAddressId_customerAddresses_id"
	}),
	orders_shippingAddressId: many(orders, {
		relationName: "orders_shippingAddressId_customerAddresses_id"
	}),
	customer: one(customers, {
		fields: [customerAddresses.customerId],
		references: [customers.id]
	}),
}));

export const cartArtworkRelations = relations(cartArtwork, ({one}) => ({
	cartLine_cartLineId: one(cartLines, {
		fields: [cartArtwork.cartLineId],
		references: [cartLines.id],
		relationName: "cartArtwork_cartLineId_cartLines_id"
	}),
	cartLine_cartLineId: one(cartLines, {
		fields: [cartArtwork.cartLineId],
		references: [cartLines.id],
		relationName: "cartArtwork_cartLineId_cartLines_id"
	}),
}));

export const cartLinesRelations = relations(cartLines, ({one, many}) => ({
	cartArtworks_cartLineId: many(cartArtwork, {
		relationName: "cartArtwork_cartLineId_cartLines_id"
	}),
	cartArtworks_cartLineId: many(cartArtwork, {
		relationName: "cartArtwork_cartLineId_cartLines_id"
	}),
	cart_cartId: one(carts, {
		fields: [cartLines.cartId],
		references: [carts.id],
		relationName: "cartLines_cartId_carts_id"
	}),
	cart_cartId: one(carts, {
		fields: [cartLines.cartId],
		references: [carts.id],
		relationName: "cartLines_cartId_carts_id"
	}),
}));

export const cartsRelations = relations(carts, ({many}) => ({
	cartLines_cartId: many(cartLines, {
		relationName: "cartLines_cartId_carts_id"
	}),
	cartLines_cartId: many(cartLines, {
		relationName: "cartLines_cartId_carts_id"
	}),
}));

export const orderItemsRelations = relations(orderItems, ({one}) => ({
	order: one(orders, {
		fields: [orderItems.orderId],
		references: [orders.id]
	}),
}));

export const orderArtworkRelations = relations(orderArtwork, ({one}) => ({
	order: one(orders, {
		fields: [orderArtwork.orderId],
		references: [orders.id]
	}),
}));

export const productOptionGroupsRelations = relations(productOptionGroups, ({one, many}) => ({
	product_productId: one(products, {
		fields: [productOptionGroups.productId],
		references: [products.id],
		relationName: "productOptionGroups_productId_products_id"
	}),
	product_productId: one(products, {
		fields: [productOptionGroups.productId],
		references: [products.id],
		relationName: "productOptionGroups_productId_products_id"
	}),
	productOptions: many(productOptions),
	productOptionValues: many(productOptionValues),
}));

export const shippingCacheRelations = relations(shippingCache, ({one}) => ({
	product: one(products, {
		fields: [shippingCache.productId],
		references: [products.id]
	}),
}));

export const productCombinationValuesRelations = relations(productCombinationValues, ({one}) => ({
	product: one(products, {
		fields: [productCombinationValues.productId],
		references: [products.id]
	}),
}));

export const sinaOptionGroupsRelations = relations(sinaOptionGroups, ({one, many}) => ({
	sinaProduct: one(sinaProducts, {
		fields: [sinaOptionGroups.productId],
		references: [sinaProducts.id]
	}),
	sinaOptions: many(sinaOptions),
}));

export const sinaProductsRelations = relations(sinaProducts, ({many}) => ({
	sinaOptionGroups: many(sinaOptionGroups),
	sinaOptions: many(sinaOptions),
	sinaPricingMetas: many(sinaPricingMeta),
}));

export const sinaOptionsRelations = relations(sinaOptions, ({one}) => ({
	sinaProduct: one(sinaProducts, {
		fields: [sinaOptions.productId],
		references: [sinaProducts.id]
	}),
	sinaOptionGroup: one(sinaOptionGroups, {
		fields: [sinaOptions.productId],
		references: [sinaOptionGroups.productId]
	}),
}));

export const sinaPricingMetaRelations = relations(sinaPricingMeta, ({one}) => ({
	sinaProduct: one(sinaProducts, {
		fields: [sinaPricingMeta.productId],
		references: [sinaProducts.id]
	}),
}));

export const loyaltyWalletsRelations = relations(loyaltyWallets, ({one, many}) => ({
	customer: one(customers, {
		fields: [loyaltyWallets.customerId],
		references: [customers.id]
	}),
	loyaltyTransactions: many(loyaltyTransactions),
}));

export const productOptionsRelations = relations(productOptions, ({one}) => ({
	productOptionGroup: one(productOptionGroups, {
		fields: [productOptions.productId],
		references: [productOptionGroups.productId]
	}),
	product_productId: one(products, {
		fields: [productOptions.productId],
		references: [products.id],
		relationName: "productOptions_productId_products_id"
	}),
	product_productId: one(products, {
		fields: [productOptions.productId],
		references: [products.id],
		relationName: "productOptions_productId_products_id"
	}),
}));

export const loyaltyTransactionsRelations = relations(loyaltyTransactions, ({one}) => ({
	loyaltyWallet: one(loyaltyWallets, {
		fields: [loyaltyTransactions.walletId],
		references: [loyaltyWallets.id]
	}),
	order: one(orders, {
		fields: [loyaltyTransactions.orderId],
		references: [orders.id]
	}),
}));

export const productMetaRelations = relations(productMeta, ({one}) => ({
	product: one(products, {
		fields: [productMeta.productId],
		references: [products.id]
	}),
}));

export const productOptionValuesRelations = relations(productOptionValues, ({one}) => ({
	productOptionGroup: one(productOptionGroups, {
		fields: [productOptionValues.groupId],
		references: [productOptionGroups.id]
	}),
	product: one(products, {
		fields: [productOptionValues.productId],
		references: [products.id]
	}),
}));

export const productPricingMetaRelations = relations(productPricingMeta, ({one}) => ({
	product: one(products, {
		fields: [productPricingMeta.productId],
		references: [products.id]
	}),
}));

export const pricingMetricsRelations = relations(pricingMetrics, ({one}) => ({
	product: one(products, {
		fields: [pricingMetrics.productId],
		references: [products.id]
	}),
}));