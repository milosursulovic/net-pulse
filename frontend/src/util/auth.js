export function getToken() {
  return (
    localStorage.getItem("authToken") ||
    sessionStorage.getItem("authToken") ||
    ""
  );
}

export function authHeaders() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export async function authFetch(url, options = {}) {
  const headers = { ...options.headers, ...authHeaders() };
  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem("authToken");
    sessionStorage.removeItem("authToken");
    window.location.assign("/login");
    throw new Error("Unauthorized");
  }

  return res;
}
