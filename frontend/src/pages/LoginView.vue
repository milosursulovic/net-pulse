<template>
  <div
    class="min-h-screen grid place-items-center bg-gradient-to-br from-slate-50 to-slate-100 px-4"
  >
    <div class="w-full max-w-md">
      <!-- Header / Logo -->
      <div class="flex flex-col items-center mb-6">
        <img
          src="@/assets/logo.png"
          alt="Logo"
          class="h-16 w-16 rounded-2xl border shadow bg-white p-2 object-contain"
        />
        <h1 class="mt-3 text-2xl font-bold text-slate-800">{{ appName }}</h1>
        <p class="text-xs text-slate-500">verzija {{ appVersion }}</p>
      </div>

      <!-- Card -->
      <div class="rounded-2xl border bg-white shadow-sm p-6">
        <p class="text-sm text-slate-600 mb-4">
          Prijavi se da nastaviš u <span class="font-medium">{{ appName }}</span
          >.
        </p>

        <!-- Error -->
        <div
          v-if="error"
          class="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
        >
          {{ error }}
        </div>

        <form @submit.prevent="onSubmit" class="grid gap-3">
          <!-- Username -->
          <label class="grid gap-1">
            <span class="text-xs font-medium text-slate-600"
              >Korisničko ime</span
            >
            <input
              v-model.trim="username"
              type="text"
              autocomplete="username"
              required
              class="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="npr. admin"
            />
          </label>

          <!-- Password -->
          <label class="grid gap-1">
            <span class="text-xs font-medium text-slate-600">Lozinka</span>
            <div class="relative">
              <input
                :type="showPassword ? 'text' : 'password'"
                v-model="password"
                autocomplete="current-password"
                required
                class="w-full rounded-lg border px-3 py-2 pr-10 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
              <button
                type="button"
                class="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-slate-700"
                @click="showPassword = !showPassword"
                :title="showPassword ? 'Sakrij lozinku' : 'Prikaži lozinku'"
              >
                {{ showPassword ? "🙈" : "👁️" }}
              </button>
            </div>
          </label>

          <!-- Submit -->
          <button
            type="submit"
            :disabled="busy || !username || !password"
            class="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white shadow hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
            title="Prijava"
          >
            <span v-if="!busy">➡️ Prijavi se</span>
            <span v-else class="inline-flex items-center gap-2">
              <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle
                  class="opacity-20"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />
                <path
                  d="M22 12a10 10 0 0 1-10 10"
                  stroke="currentColor"
                  stroke-width="4"
                  stroke-linecap="round"
                />
              </svg>
              U toku…
            </span>
          </button>
        </form>
      </div>

      <!-- Footer -->
      <div class="mt-4 text-center text-xs text-slate-500">
        © {{ new Date().getFullYear() }} {{ appName }} · Build {{ appVersion }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";

const appName = "NetPulse";
const appVersion = import.meta.env.VITE_APP_VERSION || "v1.0.0";

const username = ref("");
const password = ref("");
const remember = ref(true);
const showPassword = ref(false);
const busy = ref(false);
const error = ref("");

const API_BASE = import.meta.env.VITE_API_URL;

const onSubmit = async () => {
  error.value = "";
  if (!username.value || !password.value) return;
  try {
    busy.value = true;
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username.value,
        password: password.value,
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(t || "Neispravni kredencijali ili greška na serveru.");
    }
    const data = await res.json();
    const token = data.token || data.accessToken;
    if (!token) throw new Error("Server nije vratio token.");

    const store = remember.value ? localStorage : sessionStorage;
    store.setItem("authToken", token);
    if (data.user) store.setItem("authUser", JSON.stringify(data.user));

    window.location.assign("/");
  } catch (e) {
    console.error(e);
    error.value = e.message || "Prijava nije uspela.";
  } finally {
    busy.value = false;
  }
};
</script>
