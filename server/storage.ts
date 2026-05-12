import { db } from "./db";
import {
  products,
  regions,
  categories,
  orders,
  orderItems,
  users,
  type CreateProductRequest,
  type UpdateProductRequest,
  type CreateOrderRequest,
  type Product,
  type Region,
  type Category,
  type Order,
  type OrderResponse,
  type InsertRegion,
  type InsertCategory,
  type User,
} from "@shared/schema";
import { eq, desc, sql, and } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  
  // Products
  getProducts(category?: string): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: CreateProductRequest): Promise<Product>;
  updateProduct(id: number, updates: UpdateProductRequest): Promise<Product>;
  deleteProduct(id: number): Promise<void>;

  // Regions
  getRegions(): Promise<Region[]>;
  createRegion(region: InsertRegion): Promise<Region>;
  deleteRegion(id: number): Promise<void>;

  // Categories
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  deleteCategory(id: number): Promise<void>;

  // Orders
  getOrders(userId?: string): Promise<OrderResponse[]>;
  getOrder(id: number): Promise<OrderResponse | undefined>;
  createOrder(order: CreateOrderRequest, userId?: string): Promise<Order>;
  updateOrderStatus(id: number, status: string): Promise<Order>;
  
  // Stats
  getStats(): Promise<{ totalSales: number; totalOrders: number; pendingOrders: number }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getProducts(category?: string): Promise<Product[]> {
    const { ObjectStorageService } = await import("./replit_integrations/object_storage/objectStorage");
    const service = new ObjectStorageService();
    const normalize = service.normalizeObjectEntityPath.bind(service);

    const rows: Product[] = category
      ? // @ts-ignore
        await db.select().from(products).innerJoin(categories, eq(products.categoryId, categories.id)).where(and(eq(categories.name, category), eq(products.isActive, true))).then(res => res.map(r => r.products))
      : await db.select().from(products).where(eq(products.isActive, true));

    // normalize any saved URLs to the `/objects/...` form so legacy data still works
    return rows.map(p => ({
      ...p,
      imageUrl: p.imageUrl ? normalize(p.imageUrl) : p.imageUrl,
    }));
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
      if (product && product.imageUrl) {
      const { ObjectStorageService } = await import("./replit_integrations/object_storage/objectStorage");
      const service = new ObjectStorageService();
      const normalize = service.normalizeObjectEntityPath.bind(service);
      product.imageUrl = normalize(product.imageUrl);
    }
    return product;
  }

  async createProduct(product: CreateProductRequest): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: number, updates: UpdateProductRequest): Promise<Product> {
    const [updated] = await db.update(products).set(updates).where(eq(products.id, id)).returning();
    return updated;
  }

  async deleteProduct(id: number): Promise<void> {
    // Soft delete: mark isActive as false instead of removing the row.
    // This preserves order history (FK constraint satisfied) while hiding
    // the product from listings.
    await db.update(products).set({ isActive: false }).where(eq(products.id, id));
  }

  async getRegions(): Promise<Region[]> {
    return await db.select().from(regions);
  }

  async createRegion(region: InsertRegion): Promise<Region> {
    const [newRegion] = await db.insert(regions).values(region).returning();
    return newRegion;
  }

  async deleteRegion(id: number): Promise<void> {
    await db.delete(regions).where(eq(regions.id, id));
  }

  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  async deleteCategory(id: number): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  async getOrders(userId?: string): Promise<OrderResponse[]> {
    // If userId is provided, filter by it. If not (Admin), show all.
    const whereClause = userId ? eq(orders.userId, userId) : undefined;
    
    // @ts-ignore
    const results = await db.query.orders.findMany({
      where: whereClause,
      with: {
        items: {
          with: {
            product: true
          }
        },
        region: true,
        user: true,
      },
      orderBy: [desc(orders.createdAt)],
    });

    // normalize nested product image URLs as well
    const { ObjectStorageService } = await import("./replit_integrations/object_storage/objectStorage");
    const service = new ObjectStorageService();
    const normalize = service.normalizeObjectEntityPath.bind(service);
    return (results as unknown as OrderResponse[]).map(o => ({
      ...o,
      items: o.items.map(i => ({
        ...i,
        product: i.product
          ? { ...i.product, imageUrl: i.product.imageUrl ? normalize(i.product.imageUrl) : i.product.imageUrl }
          : i.product,
      })),
    }));
  }

  async getOrder(id: number): Promise<OrderResponse | undefined> {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: {
        items: {
          with: {
            product: true
          }
        },
        region: true,
        user: true,
      }
    });
    return order;
  }

  async createOrder(orderReq: CreateOrderRequest, userId?: string): Promise<Order> {
    // Allow guest orders (userId may be undefined)
    // Start a transaction
    return await db.transaction(async (tx) => {
      // 1. Resolve region by ID or custom region name
      let region = null;
      if (orderReq.regionId) {
        [region] = await tx.select().from(regions).where(eq(regions.id, orderReq.regionId));
      } else if (orderReq.customRegion) {
        const customName = orderReq.customRegion.trim();
        const [existingRegion] = await tx.select().from(regions).where(eq(regions.name, customName));
        if (existingRegion) {
          region = existingRegion;
        } else {
          const [newRegion] = await tx.insert(regions).values({
            name: customName,
            deliveryPrice: String(0),
          }).returning();
          region = newRegion;
        }
      }

      if (!region) {
        throw new Error("Region not found or not specified");
      }

      // 2. Calculate totals and check stock
      let itemsTotal = 0;
      const orderItemsData = [];

      for (const item of orderReq.items) {
        const [product] = await tx.select().from(products).where(eq(products.id, item.productId));
        if (!product) throw new Error(`Product ${item.productId} not found`);
        if (product.stock < item.quantity) throw new Error(`Insufficient stock for ${product.name}`);

        const price = Number(product.price);
        itemsTotal += price * item.quantity;
        
        orderItemsData.push({
          productId: item.productId,
          quantity: item.quantity,
          priceAtPurchase: String(price),
        });

        // Deduct stock
        await tx.update(products)
          .set({ stock: product.stock - item.quantity })
          .where(eq(products.id, item.productId));
      }

      const deliveryPrice = Number(region.deliveryPrice);
      const totalAmount = String(itemsTotal + deliveryPrice);

      // No STK push simulation: keep MPESA transaction empty until real payment is received
      const mpesaTransactionId = null;

      // 3. Create Order
      const [newOrder] = await tx.insert(orders).values({
        userId,
        guestName: orderReq.guestName,
        guestPhone: orderReq.guestPhone,
        deliveryAddress: orderReq.deliveryAddress,
        regionId: region.id,
        totalAmount,
        status: "pending",
        paymentMethod: orderReq.paymentMethod,
        mpesaPhoneNumber: orderReq.mpesaPhoneNumber,
        mpesaTransactionId,
      }).returning();

      // 4. Create Order Items
      for (const item of orderItemsData) {
        await tx.insert(orderItems).values({
          orderId: newOrder.id,
          ...item,
        });
      }

      return newOrder;
    });
  }

  async updateOrderStatus(id: number, status: string): Promise<Order> {
    const [updated] = await db.update(orders).set({ status }).where(eq(orders.id, id)).returning();
    return updated;
  }

  async getStats(): Promise<{ totalSales: number; totalOrders: number; pendingOrders: number }> {
    const [orderStats] = await db.select({
      count: sql<number>`count(*)`,
      pending: sql<number>`count(*) filter (where ${orders.status} = 'pending')`,
      sales: sql<number>`sum(${orders.totalAmount})`
    }).from(orders);

    return {
      totalSales: Number(orderStats?.sales || 0),
      totalOrders: Number(orderStats?.count || 0),
      pendingOrders: Number(orderStats?.pending || 0),
    };
  }
}

export const storage = new DatabaseStorage();
