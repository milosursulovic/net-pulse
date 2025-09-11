import StatusChange from "../models/StatusChange.js";
import DailyUptime from "../models/DailyUptime.js";
import Computer from "../models/Computer.js";

export async function rollupDay(utcYmd) {
  const date = new Date(`${utcYmd}T00:00:00.000Z`);
  const next = new Date(`${utcYmd}T24:00:00.000Z`);

  const computers = await Computer.find({}, { _id: 1 }).lean();

  for (const c of computers) {
    const lastBefore = await StatusChange.findOne({
      computer: c._id,
      at: { $lte: date },
    })
      .sort({ at: -1 })
      .lean();
    let currentOnline = lastBefore?.online ?? false;
    const changes = await StatusChange.find({
      computer: c._id,
      at: { $gte: date, $lt: next },
    })
      .sort({ at: 1 })
      .lean();

    let cursor = date,
      up = 0,
      flaps = 0;
    for (const ch of changes) {
      if (currentOnline) up += ch.at - cursor;
      currentOnline = ch.online;
      cursor = ch.at;
      flaps++;
    }
    if (cursor < next && currentOnline) up += next - cursor;

    const total = next - date;
    await DailyUptime.updateOne(
      { computer: c._id, date: utcYmd },
      { $set: { uptimeMs: up, downtimeMs: total - up, flaps } },
      { upsert: true }
    );
  }
}
