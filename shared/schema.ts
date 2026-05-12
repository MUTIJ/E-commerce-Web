import { pgTable, text, serial, integer, boolean, timestamp, numeric, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";

export * from "./models/auth";

// === TABLE DEFINITIONS ===

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: numeric("price").notNull(), // Stored as string, handle conversion
  weight: text("weight").notNull(), // e.g., "1kg", "5kg", "50kg"
  stock: integer("stock").notNull().default(0),
  categoryId: integer("category_id").references(() => categories.id),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").default(true),
});

export const regions = pgTable("regions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  deliveryPrice: numeric("delivery_price").notNull(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  // For guest checkout (optional, but requested "Buyer enters name, phone...")
  guestName: text("guest_name"),
  guestPhone: text("guest_phone"),
  deliveryAddress: text("delivery_address").notNull(),
  regionId: integer("region_id").references(() => regions.id),
  totalAmount: numeric("total_amount").notNull(),
  status: text("status").notNull().default("pending"), // pending, processing, delivered, cancelled
  paymentMethod: text("payment_method").default("cod"), // cod, mpesa
  mpesaPhoneNumber: text("mpesa_phone_number"), // New: For STK push
  mpesaTransactionId: text("mpesa_transaction_id"), // New: To store MPESA ref
  createdAt: timestamp("created_at").defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  priceAtPurchase: numeric("price_at_purchase").notNull(),
});

// === RELATIONS ===

export const productsRelations = relations(products, ({ many }) => ({
  orderItems: many(orderItems),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  region: one(regions, {
    fields: [orders.regionId],
    references: [regions.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

// === BASE SCHEMAS ===

export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertRegionSchema = createInsertSchema(regions).omit({ id: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, status: true });
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });

// === EXPLICIT API CONTRACT TYPES ===

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Region = typeof regions.$inferSelect;
export type InsertRegion = z.infer<typeof insertRegionSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;

// Request types
export type CreateProductRequest = InsertProduct;
export type UpdateProductRequest = Partial<InsertProduct>;

export type CartItem = {
  productId: number;
  quantity: number;
};

export type CreateOrderRequest = {
  guestName?: string;
  guestPhone?: string;
  deliveryAddress: string;
  regionId?: number;
  customRegion?: string;
  paymentMethod: 'cod' | 'mpesa';
  mpesaPhoneNumber?: string;
  items: CartItem[];
};

export type UpdateOrderStatusRequest = {
  status: string;
};

// Response types
export type ProductResponse = Product;
export type RegionResponse = Region;
export type OrderResponse = Order & { 
  items?: (OrderItem & { product?: Product })[], 
  region?: Region | null, 
  user?: any 
};
