import express from "express";
import Computer from "../models/Computer.js";

const router = express.Router();

// GET all computers
router.get("/", async (req, res) => {
  const data = await Computer.find().sort({ name: 1 });
  res.json(data);
});

// POST new computer
router.post("/", async (req, res) => {
  const saved = await Computer.create(req.body);
  res.status(201).json(saved);
});

// DELETE computer
router.delete("/:id", async (req, res) => {
  await Computer.findByIdAndDelete(req.params.id);
  res.status(204).send();
});

export default router;
