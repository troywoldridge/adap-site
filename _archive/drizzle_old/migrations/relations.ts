import { relations } from "drizzle-orm/relations";
import { productReviews, reviewHelpfulVotes, cartLines, cartArtwork, orders, orderItems, carts } from "./schema";

export const reviewHelpfulVotesRelations = relations(reviewHelpfulVotes, ({one}) => ({
	productReview: one(productReviews, {
		fields: [reviewHelpfulVotes.reviewId],
		references: [productReviews.id]
	}),
}));

export const productReviewsRelations = relations(productReviews, ({many}) => ({
	reviewHelpfulVotes: many(reviewHelpfulVotes),
}));

export const cartArtworkRelations = relations(cartArtwork, ({one}) => ({
	cartLine: one(cartLines, {
		fields: [cartArtwork.cartLineId],
		references: [cartLines.id]
	}),
}));

export const cartLinesRelations = relations(cartLines, ({one, many}) => ({
	cartArtworks: many(cartArtwork),
	cart: one(carts, {
		fields: [cartLines.cartId],
		references: [carts.id]
	}),
}));

export const orderItemsRelations = relations(orderItems, ({one}) => ({
	order: one(orders, {
		fields: [orderItems.orderId],
		references: [orders.id]
	}),
}));

export const ordersRelations = relations(orders, ({many}) => ({
	orderItems: many(orderItems),
}));

export const cartsRelations = relations(carts, ({many}) => ({
	cartLines: many(cartLines),
}));