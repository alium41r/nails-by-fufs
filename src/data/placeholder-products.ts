import { Product, products } from "./products";

export type PlaceholderProduct = Product;

export const placeholderProducts: PlaceholderProduct[] = products.slice(0, 4);
