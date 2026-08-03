import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";

loadEnvConfig(process.cwd());

const MONGODB_URI =
  process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error(
    "MONGODB_URI is missing"
  );
}

declare global {
  var mongooseConnection:
    | {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
      }
    | undefined;
}

const cached =
  global.mongooseConnection || {
    conn: null,
    promise: null,
  };

global.mongooseConnection = cached;

export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise =
      mongoose.connect(MONGODB_URI);
  }

  cached.conn =
    await cached.promise;

  return cached.conn;
}