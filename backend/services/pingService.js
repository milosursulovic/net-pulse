import ping from 'ping'
import Computer from '../models/Computer.js'

export async function startPingLoop(intervalSeconds = 30) {
  console.log(`🔁 Ping service started (every ${intervalSeconds}s)`)

  setInterval(async () => {
    const computers = await Computer.find()
    const now = new Date()

    for (const comp of computers) {
      const previousStatus = comp.isOnline

      try {
        const result = await ping.promise.probe(comp.ipAddress, { timeout: 1 })
        comp.isOnline = result.alive
        comp.lastChecked = now

        if (comp.isOnline !== previousStatus) {
          comp.lastStatusChange = now
        }

        await comp.save()
        console.log(`📡 ${comp.name} (${comp.ipAddress}) → ${comp.isOnline ? 'Online' : 'Offline'}`)
      } catch (err) {
        console.error(`⚠️ Ping failed for ${comp.name}:`, err)
      }
    }
  }, intervalSeconds * 1000)
}
