import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { users, regions, categories } from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "./db";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth setup
  await setupAuth(app);
  registerAuthRoutes(app);
  registerObjectStorageRoutes(app);

  // Helper to check admin status
  const isAdmin = async (req: any) => {
    if (!req.isAuthenticated()) return false;
    const user = await storage.getUser(req.user.claims.sub);
    return user?.isAdmin === true;
  };

  // Promote current user to admin (Temporary/Helper route)
  app.post("/api/admin/promote-me", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    // @ts-ignore
    const userId = req.user.claims.sub;
    await db.update(users).set({ isAdmin: true }).where(eq(users.id, userId));
    res.json({ message: "You are now an admin! Please refresh the page." });
  });


  // Products
  app.get(api.products.list.path, async (req, res) => {
    const products = await storage.getProducts(req.query.category as string);
    res.json(products);
  });

  app.get(api.products.get.path, async (req, res) => {
    const product = await storage.getProduct(Number(req.params.id));
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  });

  app.post(api.products.create.path, async (req, res) => {
    if (!await isAdmin(req)) return res.status(403).json({ message: "Forbidden" });
    
    try {
      const input = api.products.create.input.parse(req.body);
      const product = await storage.createProduct(input);
      res.status(201).json(product);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put(api.products.update.path, async (req, res) => {
    if (!await isAdmin(req)) return res.status(403).json({ message: "Forbidden" });
    
    try {
      const input = api.products.update.input.parse(req.body);
      const product = await storage.updateProduct(Number(req.params.id), input);
      res.json(product);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.delete(api.products.delete.path, async (req, res) => {
    if (!await isAdmin(req)) return res.status(403).json({ message: "Forbidden" });
    await storage.deleteProduct(Number(req.params.id));
    res.status(204).send();
  });

  // Regions
  app.get(api.regions.list.path, async (req, res) => {
    const regions = await storage.getRegions();
    res.json(regions);
  });

  app.post(api.regions.create.path, async (req, res) => {
    if (!await isAdmin(req)) return res.status(403).json({ message: "Forbidden" });
    const input = api.regions.create.input.parse(req.body);
    const region = await storage.createRegion(input);
    res.status(201).json(region);
  });

  app.delete(api.regions.delete.path, async (req, res) => {
    if (!await isAdmin(req)) return res.status(403).json({ message: "Forbidden" });
    await storage.deleteRegion(Number(req.params.id));
    res.status(204).send();
  });

  app.put("/api/regions/:id", async (req: any, res: any) => {
    if (!await isAdmin(req)) return res.status(403).json({ message: "Forbidden" });
    try {
      const id = Number(req.params.id);
      const input = api.regions.create.input.parse(req.body);
      const [updated] = await db.update(regions).set(input).where(eq(regions.id, id)).returning();
      res.json(updated);
    } catch (err) {
      res.status(400).json({ message: "Failed to update region" });
    }
  });

  // Categories
  app.get("/api/categories", async (req, res) => {
    const categories = await storage.getCategories();
    res.json(categories);
  });

  app.post("/api/categories", async (req, res) => {
    if (!await isAdmin(req)) return res.status(403).json({ message: "Forbidden" });
    const category = await storage.createCategory(req.body);
    res.status(201).json(category);
  });

  app.delete("/api/categories/:id", async (req, res) => {
    if (!await isAdmin(req)) return res.status(403).json({ message: "Forbidden" });
    await storage.deleteCategory(Number(req.params.id));
    res.status(204).send();
  });

  app.put("/api/categories/:id", async (req: any, res: any) => {
    if (!await isAdmin(req)) return res.status(403).json({ message: "Forbidden" });
    try {
      const id = Number(req.params.id);
      const [updated] = await db.update(categories).set(req.body).where(eq(categories.id, id)).returning();
      res.json(updated);
    } catch (err) {
      res.status(400).json({ message: "Failed to update category" });
    }
  });

  // Orders
  app.get(api.orders.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const admin = await isAdmin(req);
    // If admin, show all. If user, show own.
    // @ts-ignore
    const userId = admin ? undefined : req.user?.claims?.sub;
    const orders = await storage.getOrders(userId);
    res.json(orders);
  });

  app.post(api.orders.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Login required to place order" });
    try {
      const input = api.orders.create.input.parse(req.body);
      // @ts-ignore
      const userId = req.user?.claims?.sub;
      const order = await storage.createOrder(input, userId);
      res.status(201).json(order);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      } else if (err instanceof Error) {
        return res.status(400).json({ message: err.message });
      }
      throw err;
    }
  });

  app.patch(api.orders.updateStatus.path, async (req, res) => {
    if (!await isAdmin(req)) return res.status(403).json({ message: "Forbidden" });
    
    try {
      const status = req.body.status;
      const order = await storage.updateOrderStatus(Number(req.params.id), status);
      res.json(order);
    } catch (err) {
      res.status(400).json({ message: "Failed to update status" });
    }
  });

  // Stats
  app.get(api.stats.get.path, async (req, res) => {
    if (!await isAdmin(req)) return res.status(403).json({ message: "Forbidden" });
    const stats = await storage.getStats();
    res.json(stats);
  });

  // Seed Data
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const regions = await storage.getRegions();
  if (regions.length === 0) {
    await storage.createRegion({ name: "Nairobi", deliveryPrice: "200" });
    await storage.createRegion({ name: "Mombasa", deliveryPrice: "500" });
    await storage.createRegion({ name: "Kisumu", deliveryPrice: "450" });
    await storage.createRegion({ name: "Nakuru", deliveryPrice: "300" });
    await storage.createRegion({ name: "Eldoret", deliveryPrice: "400" });
  }

  const categoriesList = await storage.getCategories();
  if (categoriesList.length === 0) {
    const seedCategories = ["Pishori", "Long Grain", "Brown", "Broken"];
    for (const cat of seedCategories) {
      await storage.createCategory({ name: cat });
    }
  }

  const productsList = await storage.getProducts();
  if (productsList.length === 0) {
    const cats = await storage.getCategories();
    const findCat = (name: string) => cats.find(c => c.name === name)?.id;

    await storage.createProduct({
      name: "Karen Pishori Rice (Grade 1)",
      description: "Premium aromatic Karen Pishori rice from Mwea. Long grains and distinct aroma.",
      price: "250",
      weight: "1kg",
      stock: 1000,
      categoryId: findCat("Pishori"),
      imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=800",
      isActive: true,
    });
    // ... update other seed products similarly
  }
}
