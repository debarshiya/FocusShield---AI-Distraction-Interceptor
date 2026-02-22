// import mongoose from "mongoose";

// export async function connectMongo(mongoUri) {
//   if (!mongoUri) throw new Error("MONGODB_URI missing");
//   mongoose.set("strictQuery", true);
//   await mongoose.connect(mongoUri, { autoIndex: true });
//   console.log("[mongo] connected");
// }

import mongoose from "mongoose";

const connectMongo = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is not defined in .env");
  }

  await mongoose.connect(uri);
  console.log("[mongo] connected");
};

export default connectMongo;