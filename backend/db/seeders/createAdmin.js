import "dotenv/config.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../../models/User.js";

async function main() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error("MONGO_URI nije definisan u .env");
    await mongoose.connect(uri);

    const username = process.env.ADMIN_USERNAME || "admin";
    const password = process.env.ADMIN_PASSWORD || "admin123";
    const rounds = Number(process.env.BCRYPT_ROUNDS || 12);

    const exists = await User.findOne({ username });
    if (exists) {
      console.log(`ℹ️ User "${username}" već postoji. (preskačem)`);
      await mongoose.disconnect();
      process.exit(0);
    }

    const passwordHash = await bcrypt.hash(password, rounds);
    await User.create({
      username,
      passwordHash,
      role: "admin",
      isActive: true,
    });
    console.log(`✅ Kreiran admin korisnik: ${username}`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeder greška:", err);
    process.exit(1);
  }
}

main();
