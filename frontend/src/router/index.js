import { createRouter, createWebHistory } from "vue-router";
import LoginView from "@/pages/LoginView.vue";
import ComputerDashboardView from "@/pages/ComputerDashboardView.vue";
import AnalyticsView from "@/pages/AnalyticsView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/login",
      name: "login",
      component: LoginView,
      meta: { requiresAuth: false },
    },
    {
      path: "/",
      name: "home",
      component: ComputerDashboardView,
      meta: { requiresAuth: true },
    },
    {
      path: "/analytics",
      name: "analytics",
      component: AnalyticsView,
      meta: { requiresAuth: true },
    },
  ],
});

router.beforeEach((to, from, next) => {
  const token =
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

  const isTokenExpired = (jwt) => {
    try {
      const [, payloadBase64] = jwt.split(".");
      const payload = JSON.parse(atob(payloadBase64));
      if (!payload.exp) return false;
      const now = Math.floor(Date.now() / 1000);
      return payload.exp < now;
    } catch {
      return true;
    }
  };

  if (to.meta.requiresAuth) {
    if (!token || isTokenExpired(token)) {
      return next({ name: "login" });
    }
  }

  if (to.name === "login" && token && !isTokenExpired(token)) {
    return next({ name: "home" });
  }

  next();
});

export default router;
