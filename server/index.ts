import express, { type Request, Response, NextFunction } from "express";
import { execSync } from "child_process";
// Provide sane defaults for local development so you can run with minimal setup.
// WARNING: These defaults contain credentials you supplied and should NOT be
// committed to a public repository. They are only applied when the env vars
// are not already set.
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://postgres:One2009Time!!@localhost:5432/Karen_sales';
}
if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = 'Hezronthewinner324';
}
import { serveStatic } from "./static";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Optionally run DB migrations/schema push before initializing modules
  // that import the database. Set AUTO_DB_PUSH=false to disable.
  try {
    if (process.env.AUTO_DB_PUSH !== "false") {
      log("Running drizzle-kit push to ensure DB schema is applied", "migrator");
      // Use npx so local devDependency is used. In production, skip if not available.
      execSync("npx drizzle-kit push", { stdio: "inherit" });
      log("drizzle-kit push completed", "migrator");
    } else {
      log("AUTO_DB_PUSH is false; skipping drizzle-kit push", "migrator");
    }
  } catch (err) {
    log(`drizzle-kit push failed: ${(err as any).message || err}`, "migrator");
    // continue startup — DB may already be initialized or user will address the error
  }

  const { registerRoutes } = await import("./routes");
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  // `reusePort` is not supported on some platforms (notably Windows).
  // Only set it when the platform supports it.
  const listenOptions: any = {
    port,
    host: "0.0.0.0",
  };
  if (process.platform !== "win32") {
    listenOptions.reusePort = true;
  }

  httpServer.listen(listenOptions, () => {
    log(`serving on port ${port}`);
  });
})();
