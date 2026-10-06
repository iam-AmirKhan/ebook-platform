import mongoose, { type Mongoose } from "mongoose";

if (typeof window !== "undefined") {
  throw new Error("Mongoose connection must only be initiated on the server.");
}

interface MongooseCache {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache as MongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

/**
 * Establishes or retrieves a cached Mongoose connection to MongoDB Atlas.
 * Prevents duplicate connections during Next.js development hot reload.
 */
export async function getMongooseConnection(): Promise<Mongoose> {
  const uri = process.env.MONGODB_URI;

  if (!uri || uri.trim() === "") {
    throw new Error(
      "Missing MONGODB_URI environment variable. Please define it in your .env.local file."
    );
  }

  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose
      .connect(uri, opts)
      .then((mongooseInstance) => {
        return mongooseInstance;
      })
      .catch((error) => {
        cached.promise = null;
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}

export { getMongooseConnection as connectToDatabase };
export default getMongooseConnection;
