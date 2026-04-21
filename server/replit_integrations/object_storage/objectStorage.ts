import { Storage, File } from "@google-cloud/storage";
import { Response } from "express";
import fs from "fs";
import { randomUUID } from "crypto";
import path from "path";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

// The object storage client is used to interact with the object storage service.
export const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

// The object storage service is used to interact with the object storage service.
export class ObjectStorageService {
  constructor() {}

  // Gets the public object search paths.
  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((path) => path.trim())
          .filter((path) => path.length > 0)
      )
    );
    if (paths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Create a bucket in 'Object Storage' " +
          "tool and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths)."
      );
    }
    return paths;
  }

  // Gets the private object directory.
  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }
    return dir;
  }

  // Search for a public object from the search paths.
  async searchPublicObject(filePath: string): Promise<File | null> {
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;

      // Full path format: /<bucket_name>/<object_name>
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);

      // Check if file exists
      const [exists] = await file.exists();
      if (exists) {
        return file;
      }
    }

    return null;
  }

  // Downloads an object to the response.
  async downloadObject(file: File, res: Response, cacheTtlSec: number = 3600) {
    try {
      // Get file metadata
      const [metadata] = await file.getMetadata();
      // Get the ACL policy for the object.
      const aclPolicy = await getObjectAclPolicy(file);
      const isPublic = aclPolicy?.visibility === "public";
      // Set appropriate headers
      res.set({
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Content-Length": metadata.size,
        "Cache-Control": `${
          isPublic ? "public" : "private"
        }, max-age=${cacheTtlSec}`,
      });

      // Stream the file to the response
      const stream = file.createReadStream();

      stream.on("error", (err) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });

      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  /**
   * Get a presigned URL to upload a new object entity.  The returned
   * object id is also provided so callers can construct the canonical
   * `/objects/...` path without having to inspect the URL.
   */
  async getObjectEntityUploadURL(): Promise<{ uploadURL: string; objectId: string }> {
    const privateObjectDir = this.getPrivateObjectDir();
    if (!privateObjectDir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }

    const objectId = randomUUID();
    const fullPath = `${privateObjectDir}/uploads/${objectId}`;

    const { bucketName, objectName } = parseObjectPath(fullPath);

    // Sign URL for PUT method with TTL
    const uploadURL = await signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
    });

    return { uploadURL, objectId };
  }

  // Gets the object entity file from the object path.
  async getObjectEntityFile(objectPath: string): Promise<File> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }

    const entityId = parts.slice(1).join("/");
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) {
      entityDir = `${entityDir}/`;
    }
    const objectEntityPath = `${entityDir}${entityId}`;
    const { bucketName, objectName } = parseObjectPath(objectEntityPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const objectFile = bucket.file(objectName);
    const [exists] = await objectFile.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    return objectFile;
  }

/**
   * Convert a raw upload URL or object path into the canonical path we
   * expose to the client.  Clients always receive something that begins
   * with `/objects/…`, which is handled by the express route
   * `GET /objects/:objectPath(*)`.
   *
   * The backend signs URLs using Google Cloud Storage under the hood, so
   * in many cases the `rawPath` will look like a long `https://storage.googleapis.com/...`.
   * Previously we only normalized paths when the URL started with that
   * exact host, and the comparison ignored a leading slash mismatch.  On
   * some environments (Replit, local dev) the signed URL may use a
   * different hostname or the PRIVATE_OBJECT_DIR value may omit a
   * leading slash, which caused us to return a path such as
   * `/mybucket/uploads/…` instead of `/objects/uploads/…`.  The browser
   * then requested the wrong route and the image never loaded for
   * customers.
   */
  normalizeObjectEntityPath(rawPath: string): string {
    // If the caller accidentally passed in an object path already, keep it
    // around so we don't add extra slashes.
    let objectPath = rawPath;

    // Try to parse as a URL; if it succeeds we'll work from the pathname
    // (this strips query parameters such as the signed URL token).
    try {
      const url = new URL(rawPath);
      objectPath = url.pathname;
    } catch {
      // not a URL, leave objectPath as-is
    }

    // Ensure leading slash so comparisons are consistent.
    if (!objectPath.startsWith("/")) {
      objectPath = "/" + objectPath;
    }

    // If PRIVATE_OBJECT_DIR is not configured (local dev), avoid throwing
    // — return the raw path so callers can handle it. This prevents the
    // server from crashing when reading legacy DB rows during startup.
    let objectEntityDir: string;
    try {
      objectEntityDir = this.getPrivateObjectDir();
    } catch (err) {
      return objectPath;
    }

    if (!objectEntityDir.startsWith("/")) {
      objectEntityDir = "/" + objectEntityDir;
    }
    if (!objectEntityDir.endsWith("/")) {
      objectEntityDir += "/";
    }

    // If the path doesn't begin with our private-object directory, we
    // cannot normalise it – just return what we already have (could be a
    // public URL or something unexpected).
    if (!objectPath.startsWith(objectEntityDir)) {
      return objectPath;
    }

    const entityId = objectPath.slice(objectEntityDir.length);
    return `/objects/${entityId}`;
  }

  // Tries to set the ACL policy for the object entity and return the normalized path.
  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }

    const objectFile = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }

  /**
   * Return true if the given object path points to a real file we can
   * serve.  Used by product creation/update to validate that an uploaded
   * image actually exists (or that the path is an absolute URL which we
   * don't check).
   */
  async objectExists(objectPath: string): Promise<boolean> {
    if (!objectPath) return false;

    // Absolute URLs we can't verify; assume true so we don't block
    // external images.
    if (objectPath.startsWith("http://") || objectPath.startsWith("https://")) {
      return true;
    }

    if (objectPath.startsWith("/objects/")) {
      try {
        await this.getObjectEntityFile(objectPath);
        return true;
      } catch {
        return false;
      }
    }

    if (objectPath.startsWith("/assets/")) {
      // resolve relative to attached_assets at repo root
      const publicPath = objectPath.slice("/assets/".length);
      const localPath = path.resolve(import.meta.dirname, "..", "..", "..", "attached_assets", publicPath);
      try {
        await fs.promises.access(localPath);
        return true;
      } catch {
        return false;
      }
    }

    return false;
  }

  // Checks if the user can access the object entity.
  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: File;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return {
    bucketName,
    objectName,
  };
}

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, ` +
        `make sure you're running on Replit`
    );
  }

  const { signed_url: signedURL } = await response.json();
  return signedURL;
}

