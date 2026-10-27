import mongoose from "mongoose";
import dbConnect from "@/lib/db/mongoose";
import fs from "fs/promises";
import path from "path";

export const COVERS_BUCKET_NAME = "book_covers";

export interface GridFSFileRecord {
  _id: mongoose.Types.ObjectId;
  filename: string;
  contentType?: string;
  length: number;
  metadata?: {
    contentType?: string;
    [key: string]: unknown;
  };
}

/**
 * Returns the GridFS bucket for book covers.
 * Ensures Mongoose connection is established.
 */
export async function getBookCoversBucket(): Promise<mongoose.mongo.GridFSBucket> {
  await dbConnect();
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("MongoDB connection failed or db instance unavailable");
  }
  return new mongoose.mongo.GridFSBucket(db, {
    bucketName: COVERS_BUCKET_NAME,
  });
}

/**
 * Uploads a book cover buffer to MongoDB GridFS durable storage.
 */
export async function uploadCoverToGridFS(
  buffer: Buffer,
  filename: string,
  contentType: string,
  metadata?: Record<string, unknown>
): Promise<{ id: string; filename: string }> {
  const bucket = await getBookCoversBucket();

  const uploadStream = bucket.openUploadStream(filename, {
    metadata: {
      contentType,
      ...metadata,
      uploadedAt: new Date(),
    },
  });

  await new Promise<void>((resolve, reject) => {
    uploadStream.once("finish", () => resolve());
    uploadStream.once("error", (err) => reject(err));
    uploadStream.end(buffer);
  });

  return {
    id: uploadStream.id.toString(),
    filename,
  };
}

/**
 * Retrieves a book cover from MongoDB GridFS by either ObjectId or filename.
 * Transparently checks local disk fallback if present and persists it to GridFS.
 */
export async function getCoverFromGridFS(
  idOrFilename: string
): Promise<{ buffer: Buffer; contentType: string; filename: string; length: number } | null> {
  const bucket = await getBookCoversBucket();
  const db = mongoose.connection.db;
  if (!db) return null;

  let fileDoc: GridFSFileRecord | null = null;

  // 1. Try finding by ObjectId if 24-character hex string
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(idOrFilename);
  if (isObjectId) {
    try {
      const files = await db
        .collection(`${COVERS_BUCKET_NAME}.files`)
        .find({ _id: new mongoose.Types.ObjectId(idOrFilename) })
        .limit(1)
        .toArray();
      if (files.length > 0) {
        fileDoc = files[0] as unknown as GridFSFileRecord;
      }
    } catch {
      // Ignore invalid ObjectId cast errors and continue
    }
  }

  // 2. Try finding by filename
  if (!fileDoc) {
    const files = await db
      .collection(`${COVERS_BUCKET_NAME}.files`)
      .find({ filename: idOrFilename })
      .sort({ uploadDate: -1 })
      .limit(1)
      .toArray();
    if (files.length > 0) {
      fileDoc = files[0] as unknown as GridFSFileRecord;
    }
  }

  // 3. If found in GridFS, read and return buffer
  if (fileDoc) {
    const targetDoc: GridFSFileRecord = fileDoc;
    const chunks: Buffer[] = [];
    const downloadStream = bucket.openDownloadStream(targetDoc._id);
    for await (const chunk of downloadStream) {
      chunks.push(chunk as Buffer);
    }
    const buffer = Buffer.concat(chunks);
    const effectiveContentType =
      targetDoc.metadata?.contentType || targetDoc.contentType || "image/jpeg";

    return {
      buffer,
      contentType: effectiveContentType,
      filename: targetDoc.filename,
      length: targetDoc.length || buffer.length,
    };
  }

  // 4. Fallback: check local public/uploads/covers/ if file exists on disk
  try {
    const localPath = path.join(process.cwd(), "public", "uploads", "covers", idOrFilename);
    const localStat = await fs.stat(localPath);
    if (localStat.isFile()) {
      const buffer = await fs.readFile(localPath);
      const ext = path.extname(idOrFilename).toLowerCase();
      const contentType =
        ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";

      // Transparently persist to GridFS so future server restarts retain it
      try {
        await uploadCoverToGridFS(buffer, idOrFilename, contentType, { migratedFromLocal: true });
      } catch (err) {
        console.warn("[GridFS] Auto-migration to GridFS failed:", err);
      }

      return {
        buffer,
        contentType,
        filename: idOrFilename,
        length: buffer.length,
      };
    }
  } catch {
    // File not found on local disk
  }

  return null;
}
