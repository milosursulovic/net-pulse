import express from "express";
import mongoose from "mongoose";
import StatusChange from "../models/StatusChange.js";
import Computer from "../models/Computer.js";

const router = express.Router();

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

router.get("/summary", async (req, res) => {
  try {
    const days = Math.max(1, Math.min(90, Number(req.query.days) || 7));
    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 3600 * 1000);
    const totalComputers = await Computer.countDocuments();
    const onlineNow = await Computer.countDocuments({ isOnline: true });
    res.json({ from, to, days, totalComputers, onlineNow });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Summary failed" });
  }
});

router.get("/top-downtime", async (req, res) => {
  try {
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

    if (agg.length) return res.json({ from, to, days, items: agg });

    const changes = await StatusChange.aggregate([
      { $match: { at: { $gte: from, $lte: to } } },
      { $sort: { computer: 1, at: 1 } },
      {
        $group: {
          _id: "$computer",
          events: { $push: { at: "$at", online: "$online" } },
        },
      },
    ]);

    const byId = new Map();
    for (const g of changes) {
      const lastBefore = await StatusChange.findOne({
        computer: g._id,
        at: { $lte: from },
      })
        .sort({ at: -1 })
        .lean();
      const comp = await Computer.findById(g._id, {
        isOnline: 1,
        name: 1,
        ipAddress: 1,
      }).lean();
      if (!comp) continue;

      let currentOnline = lastBefore?.online ?? comp.isOnline ?? false;
      let cursor = from;
      let up = 0;

      for (const ev of g.events) {
        const t = ev.at < to ? ev.at : to;
        if (currentOnline) up += t - cursor;
        currentOnline = ev.online;
        cursor = t;
      }
      if (cursor < to && currentOnline) up += to - cursor;

      const total = to - from;
      byId.set(String(g._id), {
        computerId: g._id,
        name: comp.name,
        ipAddress: comp.ipAddress,
        uptimeMs: up,
        downtimeMs: total - up,
      });
    }

    let items = Array.from(byId.values());
    if (!items.length) {
      const comps = await Computer.find().lean();
      const total = to - from;
      items = comps.map((c) => ({
        computerId: c._id,
        name: c.name,
        ipAddress: c.ipAddress,
        uptimeMs: c.isOnline ? total : 0,
        downtimeMs: c.isOnline ? 0 : total,
      }));
    }

    items.sort((a, b) => b.downtimeMs - a.downtimeMs);
    res.json({ from, to, days, items: items.slice(0, limit) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "top-downtime failed" });
  }
});

router.get("/all-downtime", async (req, res) => {
  try {
    const days = Math.max(1, Math.min(90, Number(req.query.days) || 7));
    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 3600 * 1000);
    const fromKey = from.toISOString().slice(0, 10);
    const toKey = to.toISOString().slice(0, 10);

    let items = await mongoose.connection
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

    if (!items.length) {
      const changes = await StatusChange.aggregate([
        { $match: { at: { $gte: from, $lte: to } } },
        { $sort: { computer: 1, at: 1 } },
        {
          $group: {
            _id: "$computer",
            events: { $push: { at: "$at", online: "$online" } },
          },
        },
      ]);

      const byId = new Map();
      for (const g of changes) {
        const lastBefore = await StatusChange.findOne({
          computer: g._id,
          at: { $lte: from },
        })
          .sort({ at: -1 })
          .lean();
        const comp = await Computer.findById(g._id, {
          isOnline: 1,
          name: 1,
          ipAddress: 1,
        }).lean();
        if (!comp) continue;

        let currentOnline = lastBefore?.online ?? comp.isOnline ?? false;
        let cursor = from;
        let up = 0;

        for (const ev of g.events) {
          const t = ev.at < to ? ev.at : to;
          if (currentOnline) up += t - cursor;
          currentOnline = ev.online;
          cursor = t;
        }
        if (cursor < to && currentOnline) up += to - cursor;

        const total = to - from;
        byId.set(String(g._id), {
          computerId: g._id,
          name: comp.name,
          ipAddress: comp.ipAddress,
          uptimeMs: up,
          downtimeMs: total - up,
        });
      }

      if (!byId.size) {
        const comps = await Computer.find().lean();
        const total = to - from;
        items = comps.map((c) => ({
          computerId: c._id,
          name: c.name,
          ipAddress: c.ipAddress,
          uptimeMs: c.isOnline ? total : 0,
          downtimeMs: c.isOnline ? 0 : total,
        }));
      } else {
        items = Array.from(byId.values());
      }
    }

    items.sort((a, b) => b.downtimeMs - a.downtimeMs);
    res.json({ from, to, days, items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "all-downtime failed" });
  }
});

router.get("/:computerId/uptime", async (req, res) => {
  try {
    const { computerId } = req.params;
    if (!isValidObjectId(computerId)) {
      return res.status(400).json({ error: "Invalid computerId" });
    }

    const from = new Date(req.query.from);
    const to = new Date(req.query.to || Date.now());
    if (isNaN(from) || isNaN(to) || to <= from) {
      return res.status(400).json({ error: "Invalid from/to" });
    }

    const comp = await Computer.findById(computerId).lean();
    if (!comp) return res.status(404).json({ error: "Computer not found" });

    const lastBefore = await StatusChange.findOne({
      computer: computerId,
      at: { $lte: from },
    })
      .sort({ at: -1 })
      .lean();

    let currentOnline = lastBefore?.online ?? comp.isOnline ?? false;

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
      if (currentOnline) onlineMs += t - cursor;
      currentOnline = ch.online;
      cursor = t;
    }

    if (cursor < to && currentOnline) onlineMs += to - cursor;

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
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "uptime failed" });
  }
});

router.post("/rollup", async (req, res) => {
  try {
    if (process.env.ENABLE_MANUAL_ROLLUP === "false") {
      return res.status(403).json({ error: "Manual rollup disabled" });
    }
    const ymd = String(req.query.date || new Date().toISOString().slice(0, 10));
    const { rollupDay } = await import("../jobs/rollupDaily.js");
    await rollupDay(ymd);
    res.json({ ok: true, date: ymd });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "rollup failed" });
  }
});

export default router;
