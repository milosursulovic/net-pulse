<template>
    <AppLayout>
        <template #title>📈 NetPulse – Analitika</template>

        <div class="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div class="flex items-center gap-2">
                <label class="text-sm text-gray-600">Period:</label>
                <select v-model.number="days" class="px-3 py-1.5 rounded-md border bg-white">
                    <option :value="1">1 dan</option>
                    <option :value="7">7 dana</option>
                    <option :value="14">14 dana</option>
                    <option :value="30">30 dana</option>
                    <option :value="60">60 dana</option>
                    <option :value="90">90 dana</option>
                </select>
                <button @click="loadTopDowntime"
                    class="px-3 py-1.5 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 disabled:opacity-60"
                    :disabled="busy">
                    🔄 Osveži
                </button>
                <span class="text-sm text-gray-500" v-if="busy">Učitavam…</span>
            </div>

            <div class="flex items-center gap-2">
                <label class="text-sm text-gray-600">Prikaži:</label>
                <select v-model.number="limit" class="px-3 py-1.5 rounded-md border bg-white">
                    <option :value="5">Top 5</option>
                    <option :value="10">Top 10</option>
                    <option :value="20">Top 20</option>
                </select>
            </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div class="p-4 rounded-xl border bg-white">
                <p class="text-sm text-gray-500">Period</p>
                <p class="text-lg font-semibold text-slate-800">
                    {{ formatDateTime(range.from) }} – {{ formatDateTime(range.to) }}
                </p>
            </div>
            <div class="p-4 rounded-xl border bg-white">
                <p class="text-sm text-gray-500">Ukupno stavki</p>
                <p class="text-2xl font-semibold text-slate-800">
                    {{ topItems.length }}
                </p>
            </div>
            <div class="p-4 rounded-xl border bg-white">
                <p class="text-sm text-gray-500">Najveći downtime</p>
                <p class="text-2xl font-semibold text-rose-700">
                    {{ topItems[0] ? msToPretty(topItems[0].downtimeMs) : "—" }}
                </p>
            </div>
        </div>

        <div class="rounded-xl border bg-white overflow-hidden">
            <div class="px-4 py-3 border-b bg-slate-50 text-sm font-medium text-slate-700">
                Top downtime (poslednjih {{ days }} dana)
            </div>
            <div class="overflow-x-auto">
                <table class="min-w-full text-sm">
                    <thead>
                        <tr class="bg-white border-b">
                            <th class="text-left px-4 py-2">Računar</th>
                            <th class="text-left px-4 py-2">IP</th>
                            <th class="text-left px-4 py-2">Uptime</th>
                            <th class="text-left px-4 py-2">Downtime</th>
                            <th class="text-left px-4 py-2">Akcija</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="it in topItems" :key="it.computerId" class="border-b hover:bg-slate-50">
                            <td class="px-4 py-2 font-medium">{{ it.name }}</td>
                            <td class="px-4 py-2">{{ it.ipAddress }}</td>
                            <td class="px-4 py-2 text-emerald-700">{{ msToPretty(it.uptimeMs) }}</td>
                            <td class="px-4 py-2 text-rose-700">{{ msToPretty(it.downtimeMs) }}</td>
                            <td class="px-4 py-2">
                                <button @click="openDetail(it)"
                                    class="px-2 py-1 rounded-md border bg-white hover:bg-gray-50"
                                    title="Detaljni uptime u periodu">
                                    🔍 Detalj
                                </button>
                            </td>
                        </tr>
                        <tr v-if="!topItems.length && !busy">
                            <td colspan="5" class="px-4 py-6 text-center text-gray-500">
                                Nema podataka za izabrani period.
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div v-if="detail" class="mt-6 rounded-xl border bg-white">
            <div class="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
                <div class="text-sm font-medium text-slate-700">
                    Detalj: {{ detail.name }} ({{ detail.ipAddress }})
                </div>
                <button @click="detail = null" class="text-slate-500 hover:text-slate-700">✖</button>
            </div>
            <div class="p-4 space-y-2 text-sm">
                <p>
                    <span class="text-gray-500">Uptime:</span>
                    <span class="font-medium text-emerald-700">{{ msToPretty(detail.uptimeMs) }}</span>
                </p>
                <p>
                    <span class="text-gray-500">Downtime:</span>
                    <span class="font-medium text-rose-700">{{ msToPretty(detail.downtimeMs) }}</span>
                </p>
                <p>
                    <span class="text-gray-500">Uptime %:</span>
                    <span class="font-medium">{{ detail.uptimePct.toFixed(3) }}%</span>
                </p>
                <p class="text-xs text-gray-500">
                    Prozor: {{ formatDateTime(range.from) }} – {{ formatDateTime(range.to) }}
                </p>
            </div>
        </div>
    </AppLayout>
</template>

<script setup>
import { ref, onMounted, watch } from "vue";
import AppLayout from "@/layouts/AppLayout.vue";
import { authFetch, authHeaders } from "@/util/auth";

const apiBase = `${import.meta.env.VITE_API_URL}/api/analytics`;

const days = ref(7);
const limit = ref(10);
const busy = ref(false);

const range = ref({ from: null, to: null });
const topItems = ref([]);
const detail = ref(null);

function computeRange() {
    const to = new Date();
    const from = new Date(to.getTime() - days.value * 24 * 3600 * 1000);
    range.value = { from, to };
}

function formatDateTime(d) {
    if (!d) return "";
    return new Date(d).toLocaleString();
}

function msToPretty(ms) {
    if (ms == null) return "—";
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m`;
    return `${s}s`;
}

async function loadTopDowntime() {
    try {
        busy.value = true;
        computeRange();
        const url = new URL(`${apiBase}/top-downtime`);
        url.searchParams.set("days", String(days.value));
        url.searchParams.set("limit", String(limit.value));
        const res = await authFetch(url.toString(), { headers: { ...authHeaders() } });
        if (!res.ok) throw new Error("Greška pri učitavanju top-downtime");
        const data = await res.json();
        topItems.value = data.items || [];
        detail.value = null;
    } catch (e) {
        console.error(e);
        alert("Ne mogu da učitam analitiku.");
    } finally {
        busy.value = false;
    }
}

async function openDetail(item) {
    try {
        busy.value = true;
        const url = new URL(`${apiBase}/${item.computerId}/uptime`);
        url.searchParams.set("from", range.value.from.toISOString());
        url.searchParams.set("to", range.value.to.toISOString());
        const res = await authFetch(url.toString(), { headers: { ...authHeaders() } });
        if (!res.ok) throw new Error("Greška pri učitavanju detalja");
        const data = await res.json();
        detail.value = {
            ...item,
            uptimeMs: data.uptimeMs,
            downtimeMs: data.downtimeMs,
            uptimePct: data.uptimePct,
        };
    } catch (e) {
        console.error(e);
        alert("Ne mogu da učitam detalj.");
    } finally {
        busy.value = false;
    }
}

onMounted(loadTopDowntime);
watch([days, limit], loadTopDowntime);
</script>
