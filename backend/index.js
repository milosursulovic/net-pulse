import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import fs from "fs";
import https from "https";
import computerRoutes from "./routes/computerRoutes.js";
import { startPingLoop } from "./services/pingService.js";

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

app.use("/api/computer", computerRoutes);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

https.createServer(sslOptions, app).listen(port, host, () => {
  console.log(`🚀 Express HTTPS server running at https://${host}:${port}`);
});

startPingLoop(30);
