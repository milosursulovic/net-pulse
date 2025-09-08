// src/util/auth.js

// Uzmi token iz localStorage ili sessionStorage
export function getToken() {
  return (
    localStorage.getItem("authToken") ||
    sessionStorage.getItem("authToken") ||
    ""
  );
}

// Vrati headers sa Authorization ako token postoji
export function authHeaders() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// Wrapper za fetch sa automatskim Authorization i logoutom na 401
export async function authFetch(url, options = {}) {
  const headers = { ...options.headers, ...authHeaders() };
  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    // očisti token i redirectuj na login
    localStorage.removeItem("authToken");
    sessionStorage.removeItem("authToken");
    window.location.assign("/login");
    throw new Error("Unauthorized");
  }

  return res;
}
