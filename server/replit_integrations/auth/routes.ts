import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { db } from "../../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  // Get current authenticated user
  app.get("/api/auth/user", async (req: any, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userId = req.user.claims?.sub || req.user.id;
      const user = await authStorage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/register", async (req, res) => {
    try {
      const { email, password } = req.body;
      const [existing] = await db.select().from(users).where(eq(users.email, email));
      if (existing) return res.status(400).json({ message: "User already exists" });

      // Hash the password before storing
      const hashed = await bcrypt.hash(password, 10);

      const [user] = await db.insert(users).values({
        email,
        password: hashed,
        id: Math.random().toString(36).substring(2, 15),
      }).returning();

      req.login(user, (err) => {
        if (err) return res.status(500).json({ message: "Login failed after registration" });
        res.status(201).json(user);
      });
    } catch (error) {
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/login-manual", async (req, res) => {
    try {
      const { email, password } = req.body;
      const [user] = await db.select().from(users).where(eq(users.email, email));
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const match = user.password ? await bcrypt.compare(password, user.password) : false;
      if (!match) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      req.login(user, (err) => {
        if (err) return res.status(500).json({ message: "Login failed" });
        res.json(user);
      });
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });
}
