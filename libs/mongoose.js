import mongoose from "mongoose";

if (!process.env.MONGODB_URI) {
  throw new Error(
    "Add the MONGODB_URI environment variable inside .env.local to use mongoose"
  );
}

// Cache the connection promise for serverless environments
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectMongo = async () => {
  // If already connected, return the connection
  if (cached.conn) {
    return cached.conn;
  }

  // If connection is in progress, wait for it
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(process.env.MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error("Mongoose Client Error:", e.message);
    throw e;
  }

  return cached.conn;
};

export default connectMongo;
