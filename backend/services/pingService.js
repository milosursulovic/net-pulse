import ping from "ping";
import pLimit from "p-limit";
import Computer from "../models/Computer.js";
import PingSample from "../models/PingSample.js";
import StatusChange from "../models/StatusChange.js";

export async function startPingLoop(intervalSeconds = 30, concurrency = 50) {
  console.log(
    `🔁 Ping service started (every ${intervalSeconds}s, concurrency=${concurrency})`
  );
  const limit = pLimit(concurrency);

  setInterval(async () => {
    const computers = await Computer.find().lean();
    const now = new Date();

    const results = await Promise.all(
      computers.map((c) =>
        limit(async () => {
          try {
            const r = await ping.promise.probe(c.ipAddress, { timeout: 1 });
            return {
              _id: c._id,
              name: c.name,
              ipAddress: c.ipAddress,
              alive: !!r.alive,
              latencyMs: Number.isFinite(r.time) ? Number(r.time) : null,
            };
          } catch {
            return {
              _id: c._id,
              name: c.name,
              ipAddress: c.ipAddress,
              alive: false,
              latencyMs: null,
            };
          }
        })
      )
    );

    const samples = results.map((r) => ({
      computer: r._id,
      at: now,
      alive: r.alive,
      latencyMs: r.latencyMs,
    }));
    if (samples.length)
      await PingSample.insertMany(samples, { ordered: false });

    const prevStates = await Computer.find(
      { _id: { $in: results.map((r) => r._id) } },
      { isOnline: 1 }
    ).lean();
    const prevMap = new Map(prevStates.map((p) => [String(p._id), p.isOnline]));

    const computerBulk = [];
    const statusChanges = [];

    for (const r of results) {
      const prev = prevMap.get(String(r._id));
      const changed = prev !== r.alive;

      computerBulk.push({
        updateOne: {
          filter: { _id: r._id },
          update: {
            $set: {
              isOnline: r.alive,
              lastChecked: now,
              ...(changed ? { lastStatusChange: now } : {}),
            },
          },
        },
      });

      if (changed) {
        statusChanges.push({
          computer: r._id,
          at: now,
          online: r.alive,
        });
        console.log(
          `📡 ${r.name} (${r.ipAddress}) → ${
            r.alive ? "Online" : "Offline"
          } (changed)`
        );
      }
    }

    if (computerBulk.length)
      await Computer.bulkWrite(computerBulk, { ordered: false });
    if (statusChanges.length)
      await StatusChange.insertMany(statusChanges, { ordered: false });
  }, intervalSeconds * 1000);
}
