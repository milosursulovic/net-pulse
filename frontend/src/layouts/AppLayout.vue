<template>
    <div class="min-h-screen bg-slate-50">
        <!-- Top bar -->
        <header class="w-full border-b bg-white">
            <div class="mx-auto max-w-7xl px-4 sm:px-6 py-4">
                <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <!-- Title area -->
                    <div class="flex items-center gap-3">
                        <div class="hidden sm:grid h-9 w-9 place-items-center rounded-lg bg-blue-600 text-white">NP
                        </div>
                        <div>
                            <h1 class="text-2xl sm:text-3xl font-bold text-blue-700">
                                <slot name="title">NetPulse</slot>
                            </h1>
                            <p v-if="$slots.subtitle" class="text-sm text-slate-500">
                                <slot name="subtitle"></slot>
                            </p>
                        </div>
                    </div>

                    <!-- Right side: user + actions -->
                    <div class="flex items-center gap-2 sm:gap-3 self-end sm:self-auto">
                        <!-- Page actions slot -->
                        <slot name="actions"></slot>

                        <!-- Nav pills -->
                        <nav class="hidden sm:flex items-center gap-1">
                            <button @click="goHome"
                                class="px-3 py-2 rounded-lg border bg-white text-slate-700 hover:bg-slate-50"
                                :class="!isAnalytics ? 'ring-1 ring-blue-200' : ''" title="Računari">🖥
                                Računari</button>
                            <button @click="goAnalytics"
                                class="px-3 py-2 rounded-lg border bg-white text-slate-700 hover:bg-slate-50"
                                :class="isAnalytics ? 'ring-1 ring-blue-200' : ''" title="Analitika">📈
                                Analitika</button>
                        </nav>

                        <!-- User badge -->
                        <div class="flex items-center gap-2 rounded-xl border bg-white px-3 py-2">
                            <div
                                class="grid h-8 w-8 place-items-center rounded-full bg-blue-600 text-white font-semibold">
                                {{ initials }}
                            </div>
                            <div class="leading-tight">
                                <p class="text-sm font-medium text-slate-800 truncate max-w-[180px]"
                                    :title="displayName">
                                    {{ displayName }}
                                </p>
                                <p class="text-xs text-slate-500">{{ userRole }}</p>
                            </div>
                        </div>

                        <!-- Logout -->
                        <button @click="logout"
                            class="px-3 py-2 rounded-lg border bg-white text-slate-700 hover:bg-slate-50"
                            title="Odjavi se">🚪 Logout</button>
                    </div>
                </div>
            </div>
        </header>

        <!-- Page content -->
        <main class="mx-auto max-w-7xl w-full px-4 sm:px-6 py-6">
            <slot />
        </main>

        <!-- Footer -->
        <footer class="mt-8 border-t bg-white">
            <div class="mx-auto max-w-7xl px-4 sm:px-6 py-3 text-center text-xs text-slate-400">
                NetPulse • Build {{ appVersion }}
            </div>
        </footer>
    </div>
</template>

<script setup>
import { onMounted } from "vue";
import { useAuthUser } from "@/composables/useAuthUser";

const {
    appVersion, displayName, userRole, initials,
    initFromStorage, logout, goHome, goAnalytics, isAnalytics
} = useAuthUser();

onMounted(initFromStorage);
</script>
