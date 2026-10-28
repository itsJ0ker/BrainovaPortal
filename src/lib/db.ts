import mongoose from "mongoose";

interface GlobalWithMongoose {
  mongoose: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
}

declare const global: GlobalWithMongoose;

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectDB(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState >= 1) {
    cached.conn = mongoose;
    return mongoose;
  }

  if (cached.conn) {
    return cached.conn;
  }

  let uri = process.env.MONGODB_URI;

  if (!uri) {
    // In dev or test environments when MONGODB_URI is not set, initialize in-memory mongodb
    if (process.env.NODE_ENV === "test" || !process.env.MONGODB_URI) {
      try {
        const { MongoMemoryServer } = await import("mongodb-memory-server");
        const mongod = await MongoMemoryServer.create();
        uri = mongod.getUri();
        process.env.MONGODB_URI = uri;
      } catch (err) {
        console.warn("Could not start MongoMemoryServer fallback:", err);
        uri = "mongodb://127.0.0.1:27017/schexamport_dev";
      }
    }
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    };

    cached.promise = mongoose.connect(uri || "mongodb://127.0.0.1:27017/schexamport_dev", opts).then((m) => {
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;
