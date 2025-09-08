import { createRouter, createWebHistory } from "vue-router";
import LoginView from "@/pages/LoginView.vue";
import ComputerDashboardView from "@/pages/ComputerDashboardView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/login",
      name: "login",
      component: LoginView,
      meta: { requiresAuth: false }, // login ne traži auth
    },
    {
      path: "/",
      name: "home",
      component: ComputerDashboardView,
      meta: { requiresAuth: true }, // dashboard traži auth
    },
  ],
});

// ==== GLOBAL GUARD ====
router.beforeEach((to, from, next) => {
  const token =
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

  // ovde možeš proveriti i istekao li je token, ako imaš exp polje u JWT
  const isTokenExpired = (jwt) => {
    try {
      const [, payloadBase64] = jwt.split(".");
      const payload = JSON.parse(atob(payloadBase64));
      if (!payload.exp) return false; // ako nema exp, ignoriši
      const now = Math.floor(Date.now() / 1000);
      return payload.exp < now;
    } catch {
      return true; // ako je nešto polomljeno, tretiraj kao expired
    }
  };

  if (to.meta.requiresAuth) {
    if (!token || isTokenExpired(token)) {
      return next({ name: "login" });
    }
  }

  // ako si već ulogovan a ideš na /login, redirectuj na home
  if (to.name === "login" && token && !isTokenExpired(token)) {
    return next({ name: "home" });
  }

  next();
});

export default router;
