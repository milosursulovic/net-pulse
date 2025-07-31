<template>
  <div class="w-full px-4 sm:px-6 py-6">
    <h1 class="text-3xl font-bold text-blue-700 mb-6">🖥 NetPulse – Računari</h1>

    <form @submit.prevent="addComputer" class="flex flex-col md:flex-row gap-4 mb-8">
      <input v-model="newComputer.name" placeholder="Naziv" required
        class="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <input v-model="newComputer.ipAddress" placeholder="IP adresa" required
        class="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
        ➕ Dodaj
      </button>
    </form>

    <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
      <div v-for="computer in computers" :key="computer.id"
        class="p-4 border rounded-xl shadow-sm bg-white flex flex-col justify-between">
        <div>
          <p class="font-semibold text-lg">{{ computer.name }}</p>
          <p class="text-sm text-gray-600">{{ computer.ipAddress }}</p>
          <p class="text-xs text-gray-500">
            {{ formatStatusDuration(computer) }}
          </p>
          <p class="text-xs text-gray-400">
            Poslednja provera: {{ formatDate(computer.lastChecked) }}
          </p>
        </div>
        <div class="flex items-center justify-between mt-4">
          <span class="px-2 py-1 text-sm font-medium rounded-full"
            :class="computer.isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
            {{ computer.isOnline ? 'Online' : 'Offline' }}
          </span>
          <button @click="confirmDelete(computer._id)" class="text-red-500 hover:text-red-700">
            🗑
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const computers = ref([])
const newComputer = ref({ name: '', ipAddress: '' })
const apiBase = `${import.meta.env.VITE_API_URL}/api/computer`

const loadComputers = async () => {
  const res = await fetch(apiBase)
  computers.value = await res.json()
}

const addComputer = async () => {
  await fetch(apiBase, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newComputer.value)
  })
  newComputer.value = { name: '', ipAddress: '' }
  await loadComputers()
}

const deleteComputer = async (id) => {
  await fetch(`${apiBase}/${id}`, { method: 'DELETE' })
  await loadComputers()
}

const confirmDelete = async (id) => {
  if (confirm('Da li ste sigurni da želite da obrišete ovaj računar?')) {
    await deleteComputer(id)
  }
}

// ⏱ Prikaz koliko dugo je status nepromenjen
const formatStatusDuration = (computer) => {
  if (!computer.lastStatusChange) return ''
  const since = new Date(computer.lastStatusChange)
  const now = new Date()
  const diff = Math.floor((now - since) / 1000)
  const minutes = Math.floor(diff / 60)
  const seconds = diff % 60
  const label = computer.isOnline ? 'Online već' : 'Offline već'
  return `${label} ${minutes}m ${seconds}s`
}

// 🕒 Formatiranje datuma
const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleString()
}

// 🔁 Auto-refresh svakih 10s
let intervalId
onMounted(() => {
  loadComputers()
  intervalId = setInterval(loadComputers, 10000)
})

onUnmounted(() => {
  clearInterval(intervalId)
})
</script>
