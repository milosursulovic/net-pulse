<template>
  <div class="w-full px-4 sm:px-6 py-6">
    <h1 class="text-3xl font-bold text-blue-700 mb-6">🖥 NetPulse – Računari</h1>

    <!-- Dodavanje pojedinačnog računara -->
    <form @submit.prevent="addComputer" class="flex flex-col md:flex-row gap-4 mb-6">
      <input v-model="newComputer.name" placeholder="Naziv" required
        class="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <input v-model="newComputer.ipAddress" placeholder="IP adresa" required
        class="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60"
        :disabled="busy" title="Dodaj jedan računar">
        ➕ Dodaj
      </button>
    </form>

    <!-- Import iz XLSX (ulepšan upload) -->
    <div class="mb-8">
      <div class="relative rounded-xl border-2 border-dashed"
        :class="isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50'"
        @dragenter.prevent="onDragEnter" @dragover.prevent="onDragOver" @dragleave.prevent="onDragLeave"
        @drop.prevent="onDrop">
        <div class="p-5 sm:p-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <!-- Leva strana: tekst + dugme -->
          <div class="flex items-start sm:items-center gap-4">
            <div class="shrink-0 hidden sm:flex h-10 w-10 items-center justify-center rounded-full bg-white shadow">
              📄
            </div>
            <div class="space-y-1">
              <p class="text-sm text-gray-700">
                Prevuci <span class="font-medium">.xlsx</span> fajl ovde
                <span class="text-gray-500">ili</span>
                <button type="button" @click="browseFile"
                  class="font-medium text-blue-700 hover:underline focus:outline-none">
                  odaberi sa diska
                </button>.
              </p>
              <p class="text-xs text-gray-500">Očekivane kolone: <code class="font-mono">ipAddress</code>, <code
                  class="font-mono">name</code></p>
            </div>
          </div>

          <!-- Desna strana: akcije -->
          <div class="flex items-center gap-2">
            <button @click="downloadTemplate" type="button"
              class="px-3 py-2 bg-white text-gray-800 rounded-md border hover:bg-gray-50"
              title="Preuzmi XLSX šablon (ipAddress, name)">
              ⬇️ Šablon
            </button>
            <button @click="importComputers" type="button"
              class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-60"
              :disabled="!selectedFile || busy" title="Importuj IP + Naziv iz XLSX">
              📥 Importuj
            </button>
          </div>
        </div>

        <!-- Skriveni <input type="file"> -->
        <input ref="fileInputRef" type="file" accept=".xlsx" class="sr-only" @change="handleFileUpload" />
      </div>

      <!-- Informacije o selektovanom fajlu -->
      <div v-if="selectedFile" class="mt-3 flex items-center justify-between gap-3 rounded-lg border bg-white p-3">
        <div class="min-w-0">
          <p class="truncate text-sm font-medium text-gray-800">
            {{ selectedFile.name }}
          </p>
          <p class="text-xs text-gray-500">{{ prettySize(selectedFile.size) }}</p>
        </div>
        <button type="button" @click="clearSelectedFile" class="text-gray-500 hover:text-gray-700" title="Ukloni fajl">
          ✖
        </button>
      </div>

      <!-- Rezultat importa -->
      <p v-if="importInfo" class="mt-2 text-sm text-gray-600">
        {{ importInfo }}
      </p>
    </div>

    <!-- Status -->
    <div class="flex items-center gap-3 mb-4">
      <button @click="loadComputers"
        class="px-3 py-1.5 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 disabled:opacity-60" :disabled="busy"
        title="Osveži listu odmah">
        🔄 Osveži
      </button>
      <span class="text-sm text-gray-500" v-if="busy">Učitavam…</span>
      <span class="text-sm text-gray-500" v-else>Automatsko osvežavanje na 10s</span>
    </div>

    <!-- Lista računara -->
    <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
      <div v-for="computer in computers" :key="computer._id || computer.id"
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
          <button @click="confirmDelete(computer._id || computer.id)" class="text-red-500 hover:text-red-700">
            🗑
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as XLSX from 'xlsx'

const computers = ref([])
const newComputer = ref({ name: '', ipAddress: '' })
const selectedFile = ref(null)
const importInfo = ref('')
const busy = ref(false)
const isDragging = ref(false)
const fileInputRef = ref(null)

const apiBase = `${import.meta.env.VITE_API_URL}/api/computer`

const loadComputers = async () => {
  try {
    busy.value = true
    const res = await fetch(apiBase)
    if (!res.ok) throw new Error('Greška pri učitavanju')
    computers.value = await res.json()
  } catch (e) {
    console.error(e)
    alert('Ne mogu da učitam računare.')
  } finally {
    busy.value = false
  }
}

const addComputer = async () => {
  try {
    busy.value = true
    const res = await fetch(apiBase, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newComputer.value)
    })
    if (!res.ok) throw new Error('Greška pri dodavanju')
    newComputer.value = { name: '', ipAddress: '' }
    await loadComputers()
  } catch (e) {
    console.error(e)
    alert('Dodavanje nije uspelo.')
  } finally {
    busy.value = false
  }
}

const deleteComputer = async (id) => {
  try {
    busy.value = true
    const res = await fetch(`${apiBase}/${id}`, { method: 'DELETE' })
    if (res.status !== 204) throw new Error('Greška pri brisanju')
    await loadComputers()
  } catch (e) {
    console.error(e)
    alert('Brisanje nije uspelo.')
  } finally {
    busy.value = false
  }
}

const confirmDelete = async (id) => {
  if (confirm('Da li ste sigurni da želite da obrišete ovaj računar?')) {
    await deleteComputer(id)
  }
}

/* ============ ULEPŠAN UPLOAD ============ */
const browseFile = () => {
  fileInputRef.value?.click()
}

const handleFileUpload = (e) => {
  importInfo.value = ''
  const f = e.target.files?.[0]
  if (f && !f.name.toLowerCase().endsWith('.xlsx')) {
    alert('Podržan je samo .xlsx fajl.')
    e.target.value = ''
    return
  }
  selectedFile.value = f || null
}

const clearSelectedFile = () => {
  selectedFile.value = null
  if (fileInputRef.value) fileInputRef.value.value = ''
}

const onDragEnter = () => (isDragging.value = true)
const onDragOver = () => (isDragging.value = true)
const onDragLeave = () => (isDragging.value = false)
const onDrop = (e) => {
  isDragging.value = false
  if (!e.dataTransfer?.files?.length) return
  const f = e.dataTransfer.files[0]
  if (!f.name.toLowerCase().endsWith('.xlsx')) {
    alert('Podržan je samo .xlsx fajl.')
    return
  }
  selectedFile.value = f
}

/* ============ IMPORT ============ */
const importComputers = async () => {
  if (!selectedFile.value) {
    alert('Izaberi XLSX fajl!')
    return
  }
  const formData = new FormData()
  formData.append('file', selectedFile.value)

  try {
    busy.value = true
    const res = await fetch(`${apiBase}/import`, { method: 'POST', body: formData })
    if (!res.ok) throw new Error('Greška pri importu')
    const data = await res.json()
    importInfo.value = `Importovano: ${data.imported ?? 0}`
    clearSelectedFile()
    await loadComputers()
  } catch (e) {
    console.error(e)
    alert('Import nije uspeo.')
  } finally {
    busy.value = false
  }
}

/* ============ XLSX ŠABLON ============ */
const downloadTemplate = () => {
  const data = [
    ['ipAddress', 'name'],
    ['192.168.1.10', 'PC-01'],
    ['192.168.1.11', 'PC-02']
  ]
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(data)
  ws['!cols'] = [{ wch: 16 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(wb, ws, 'Import')
  XLSX.writeFile(wb, 'netpulse_import_template.xlsx')
}

/* ============ UTIL ============ */
const prettySize = (bytes) => {
  if (!bytes && bytes !== 0) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0, n = bytes
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++ }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`
}

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

const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleString()
}

let intervalId
onMounted(() => {
  loadComputers()
  intervalId = setInterval(loadComputers, 10000)
})

onUnmounted(() => {
  clearInterval(intervalId)
})
</script>
