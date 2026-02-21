import mongoose from "mongoose";

export async function connectMongo(mongoUri) {
  if (!mongoUri) throw new Error("MONGODB_URI missing");
  mongoose.set("strictQuery", true);
  await mongoose.connect(mongoUri, { autoIndex: true });
  console.log("[mongo] connected");
}