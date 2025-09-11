// src/composables/useAuthUser.js
import { ref, computed } from "vue";
import { useRouter, useRoute } from "vue-router";

function decodeJwtUsername(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(json);
    return payload.username || null;
  } catch {
    return null;
  }
}

export function useAuthUser() {
  const router = useRouter();
  const route = useRoute();

  const appVersion = import.meta.env.VITE_APP_VERSION || "v1.0.0";
  const displayName = ref("Korisnik");
  const userRole = ref("user");

  const initFromStorage = () => {
    const u =
      localStorage.getItem("authUser") || sessionStorage.getItem("authUser");
    if (u) {
      try {
        const parsed = JSON.parse(u);
        displayName.value = parsed.username || parsed.name || "Korisnik";
        userRole.value = parsed.role || "user";
        return;
      } catch {}
    }
    const t =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    if (t) {
      const un = decodeJwtUsername(t);
      if (un) displayName.value = un;
    }
  };

  const initials = computed(() => {
    const parts = String(displayName.value || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  });

  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("authUser");
    router.replace({ name: "login" }).catch(() => router.push("/login"));
  };

  const goHome = () => router.push("/");
  const goAnalytics = () => router.push("/analytics");
  const isAnalytics = computed(() => route.path.startsWith("/analytics"));

  return {
    appVersion,
    displayName,
    userRole,
    initials,
    initFromStorage,
    logout,
    goHome,
    goAnalytics,
    isAnalytics,
  };
}
