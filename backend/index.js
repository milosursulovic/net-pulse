import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import fs from "fs";
import https from "https";
import computerRoutes from "./routes/computerRoutes.js";
import { startPingLoop } from "./services/pingService.js";
import authRoutes from "./routes/authRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import { requireAuth } from "./middlewares/auth.js";
import { rollupDay } from "./jobs/rollupDaily.js";
import cron from "node-cron";

dotenv.config();

const app = express();
const host = process.env.HOST;
const port = process.env.PORT;

const keyPath = process.env.SSL_KEY;
const certPath = process.env.SSL_CERT;

if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  console.error("❌ SSL cert or key file not found! Check .env paths.");
  process.exit(1);
}

const sslOptions = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath),
};

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/computer", requireAuth, computerRoutes);
app.use("/api/analytics", requireAuth, analyticsRoutes);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

https.createServer(sslOptions, app).listen(port, host, () => {
  console.log(`🚀 Express HTTPS server running at https://${host}:${port}`);
});

startPingLoop(30);

// zakazani nightly rolap — svaki dan u 00:05 UTC
cron.schedule(
  "5 0 * * *",
  async () => {
    try {
      const today = new Date();
      const ymd = new Date(today.getTime() - 24 * 3600 * 1000) // juče
        .toISOString()
        .slice(0, 10);
      console.log(`📊 Pokrećem rolap za dan ${ymd}...`);
      await rollupDay(ymd);
      console.log(`✅ Rolap ${ymd} završen`);
    } catch (err) {
      console.error("❌ Greška u rolapu:", err);
    }
  },
  { timezone: "UTC" }
); // da se ne pomeri sa lokalnim TZ
