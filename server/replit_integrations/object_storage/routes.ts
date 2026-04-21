import type { Express } from "express";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";

/**
 * Register object storage routes for file uploads.
 *
 * This provides example routes for the presigned URL upload flow:
 * 1. POST /api/uploads/request-url - Get a presigned URL for uploading
 * 2. The client then uploads directly to the presigned URL
 *
 * IMPORTANT: These are example routes. Customize based on your use case:
 * - Add authentication middleware for protected uploads
 * - Add file metadata storage (save to database after upload)
 * - Add ACL policies for access control
 */
export function registerObjectStorageRoutes(app: Express): void {
  const objectStorageService = new ObjectStorageService();

  /**
   * Request a presigned URL for file upload.
   *
   * Request body (JSON):
   * {
   *   "name": "filename.jpg",
   *   "size": 12345,
   *   "contentType": "image/jpeg"
   * }
   *
   * Response:
   * {
   *   "uploadURL": "https://storage.googleapis.com/...",
   *   "objectPath": "/objects/uploads/uuid"
   * }
   *
   * IMPORTANT: The client should NOT send the file to this endpoint.
   * Send JSON metadata only, then upload the file directly to uploadURL.
   */
  app.post("/api/uploads/request-url", async (req, res) => {
    try {
      const { name, size, contentType } = req.body;

      if (!name) {
        return res.status(400).json({
          error: "Missing required field: name",
        });
      }

      // Try to get a presigned URL from the object storage service.
      // If the service is not configured (e.g. LOCAL dev without
      // PRIVATE_OBJECT_DIR), fall back to a direct upload endpoint that
      // saves files under `attached_assets/uploads` and is served from
      // `/assets/uploads/...`.
      try {
        const { uploadURL, objectId } = await objectStorageService.getObjectEntityUploadURL();
        const objectPath = `/objects/uploads/${objectId}`;
        return res.json({ uploadURL, objectPath, metadata: { name, size, contentType } });
      } catch (err: any) {
        console.warn("object storage unavailable, falling back to direct upload:", err?.message || err);
        const objectId = randomUUID();
        let ext = path.extname(name || "") || "";
        if (!ext && contentType.startsWith('image/')) {
          ext = '.' + contentType.split('/')[1];
        }
        const filename = `${objectId}${ext}`;
        const uploadURL = `/api/uploads/direct/${objectId}?name=${encodeURIComponent(name || filename)}`;
        const objectPath = `/assets/uploads/${filename}`;
        return res.json({ uploadURL, objectPath, metadata: { name, size, contentType } });
      }
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  // Direct upload endpoint (dev fallback). Clients PUT the file bytes
  // to this URL returned by the fallback above. The server writes the
  // bytes to disk under `attached_assets/uploads` and returns the
  // public `/assets/uploads/...` path.
  app.put("/api/uploads/direct/:id", async (req, res) => {
    const id = req.params.id;
    const name = typeof req.query.name === "string" ? req.query.name : String(req.query.name || id);
    const contentType = req.headers['content-type'] || '';
    let ext = path.extname(name) || "";
    if (!ext && contentType.startsWith('image/')) {
      ext = '.' + contentType.split('/')[1];
    }
    const uploadsDir = path.resolve(import.meta.dirname, "..", "..", "..", "attached_assets", "uploads");
    console.log("[direct upload] uploadsDir=", uploadsDir);
    try {
      await fs.promises.mkdir(uploadsDir, { recursive: true });
      const filename = `${id}${ext}`;
      const filepath = path.join(uploadsDir, filename);
      console.log("[direct upload] writing to", filepath);

      const writeStream = fs.createWriteStream(filepath);
      req.pipe(writeStream);

      writeStream.on("finish", async () => {
        console.log("[direct upload] finished write");
        // show contents of uploadsDir after write
        try {
          const files = await fs.promises.readdir(uploadsDir);
          console.log("[direct upload] uploadsDir contents:", files);
        } catch (e) {
          console.error("[direct upload] readdir error", e);
        }
        res.status(201).json({ objectPath: `/assets/uploads/${filename}` });
      });

      writeStream.on("error", (err) => {
        console.error("Direct upload write error:", err);
        res.status(500).json({ error: "Failed to save file" });
      });
    } catch (err) {
      console.error("Direct upload failed:", err);
      res.status(500).json({ error: "Direct upload failed" });
    }
  });

  /**
   * Serve uploaded objects.
   *
   * GET /objects/:objectPath(*)
   *
   * This serves files from object storage. For public files, no auth needed.
   * For protected files, add authentication middleware and ACL checks.
   */
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      // log for debugging – many broken-image reports come from the
      // request not matching the bucket/path we expect, so this helps
      // surface what the browser is actually asking for.
      console.log("[object-storage] GET", req.path);
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Object not found" });
      }
      return res.status(500).json({ error: "Failed to serve object" });
    }
  });
}

