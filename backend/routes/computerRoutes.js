import express from "express";
import Computer from "../models/Computer.js";
import multer from "multer";
import * as XLSX from "xlsx";
import { isIP } from "node:net";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.get("/", async (req, res) => {
  const data = await Computer.find().sort({ name: 1 });
  res.json(data);
});

router.post("/", async (req, res) => {
  const saved = await Computer.create(req.body);
  res.status(201).json(saved);
});

router.delete("/:id", async (req, res) => {
  await Computer.findByIdAndDelete(req.params.id);
  res.status(204).send();
});

router.post("/import", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ error: "Fajl nije poslat (field: 'file')." });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return res.status(400).json({ error: "XLSX nema ni jedan sheet." });
    }

    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
    });

    if (!Array.isArray(sheet) || sheet.length === 0) {
      return res.status(400).json({ error: "Sheet je prazan." });
    }

    let startIndex = 0;
    const firstRow = sheet[0] || [];
    const looksLikeHeader =
      String(firstRow[0] || "")
        .toLowerCase()
        .trim() === "ipaddress" &&
      String(firstRow[1] || "")
        .toLowerCase()
        .trim() === "name";
    if (looksLikeHeader) startIndex = 1;

    const rows = sheet.slice(startIndex);

    const existing = await Computer.find({}, "ipAddress").lean();
    const existingIps = new Set(
      existing.map((c) => String(c.ipAddress).trim())
    );

    const seenInFile = new Set();

    const toInsert = [];
    let skippedExisting = 0;
    let skippedInvalid = 0;

    for (const r of rows) {
      const ipRaw = r?.[0];
      const nameRaw = r?.[1];

      const ip =
        typeof ipRaw === "string" ? ipRaw.trim() : String(ipRaw || "").trim();
      const name =
        typeof nameRaw === "string"
          ? nameRaw.trim()
          : String(nameRaw || "").trim();

      if (!ip || !name || !isIP(ip)) {
        skippedInvalid++;
        continue;
      }

      if (existingIps.has(ip) || seenInFile.has(ip)) {
        skippedExisting++;
        continue;
      }

      seenInFile.add(ip);

      toInsert.push({ ipAddress: ip, name });
    }

    if (toInsert.length > 0) {
      await Computer.insertMany(toInsert, { ordered: false });
    }

    res.json({
      totalRows: rows.length,
      imported: toInsert.length,
      skippedExisting,
      skippedInvalid,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Import failed" });
  }
});

export default router;
