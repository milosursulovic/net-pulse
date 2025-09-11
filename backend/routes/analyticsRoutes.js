// routes/analytics.js
import express from "express";
import StatusChange from "../models/StatusChange.js";
import Computer from "../models/Computer.js";
import mongoose from "mongoose";  

const router = express.Router();

router.get("/:computerId/uptime", async (req, res) => {
  const { computerId } = req.params;
  const from = new Date(req.query.from);
  const to = new Date(req.query.to || Date.now());

  if (isNaN(from) || isNaN(to) || to <= from) {
    return res.status(400).json({ error: "Invalid from/to" });
  }

  const lastBefore = await StatusChange.findOne({
    computer: computerId,
    at: { $lte: from },
  })
    .sort({ at: -1 })
    .lean();

    const comp = await Computer.findById(computerId).lean();
  let currentOnline = lastBefore?.online ?? comp?.isOnline ?? false;

  const changes = await StatusChange.find({
    computer: computerId,
    at: { $gte: from, $lte: to },
  })
    .sort({ at: 1 })
    .lean();

  let cursor = from;
  let onlineMs = 0;

  for (const ch of changes) {
    const t = ch.at < to ? ch.at : to;
    if (currentOnline) {
      onlineMs += t - cursor;
    }
    currentOnline = ch.online;
    cursor = t;
  }

  if (cursor < to && currentOnline) {
    onlineMs += to - cursor;
  }

  const totalMs = to - from;
  const uptimePct = totalMs > 0 ? (onlineMs / totalMs) * 100 : 0;

  res.json({
    computerId,
    from,
    to,
    uptimeMs: onlineMs,
    downtimeMs: totalMs - onlineMs,
    uptimePct: Number(uptimePct.toFixed(3)),
  });
});

router.get("/top-downtime", async (req, res) => {
  const days = Math.max(1, Math.min(90, Number(req.query.days) || 7));
  const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 10));
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 3600 * 1000);
  const fromKey = from.toISOString().slice(0, 10);
  const toKey = to.toISOString().slice(0, 10);

  const agg = await mongoose.connection
    .collection("dailyuptimes")
    .aggregate([
      { $match: { date: { $gte: fromKey, $lte: toKey } } },
      {
        $group: {
          _id: "$computer",
          downtimeMs: { $sum: "$downtimeMs" },
          uptimeMs: { $sum: "$uptimeMs" },
        },
      },
      { $sort: { downtimeMs: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "computers",
          localField: "_id",
          foreignField: "_id",
          as: "comp",
        },
      },
      { $unwind: "$comp" },
      {
        $project: {
          _id: 0,
          computerId: "$_id",
          name: "$comp.name",
          ipAddress: "$comp.ipAddress",
          downtimeMs: 1,
          uptimeMs: 1,
        },
      },
    ])
    .toArray();

  res.json({ from, to, days, items: agg });
});

export default router;
