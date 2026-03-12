import axios from "axios";

// const API_BASE = import.meta?.env?.VITE_API_BASE_URL || "http://localhost:5050";



function getCookie(name) {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1];
}

const api = axios.create({
  baseURL: "http://localhost:5050",
  withCredentials: true, // send cookies cross-origin
});

// --- CSRF: attach token header automatically for mutating requests ---
api.interceptors.request.use((config) => {
  const method = (config.method || "get").toLowerCase();
  const isMutating = ["post", "put", "patch", "delete"].includes(method);

  if (isMutating) {
    const csrf = getCookie("csrf_token");
    if (csrf) config.headers["X-CSRF-Token"] = csrf;
  }

  return config;
});

// --- Refresh token handling (single-flight refresh + retry once) ---
let refreshPromise = null;

async function refreshAccessToken() {
  // Only one refresh call at a time
  if (!refreshPromise) {
    refreshPromise = api
      .post("/auth/refresh")
      .finally(() => (refreshPromise = null));
  }
  return refreshPromise;
}
const isAuthEndpoint = (url = "") =>
  url.includes("/auth/login") ||
  url.includes("/auth/register") ||
  url.includes("/auth/csrf") ||
  url.includes("/auth/refresh") ||
  url.includes("/auth/logout");

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const status = err?.response?.status;
    const original = err?.config;

    if (
      status === 401 &&
      original &&
      !original._retry &&
      !isAuthEndpoint(original.url)
    ) {
      original._retry = true;
      try {
        await refreshAccessToken();
        return api(original);
      } catch {
        // fall through
      }
    }

    err.userMessage =
      err?.response?.data?.error ||
      err?.response?.data?.message ||
      err.message ||
      "Request failed";

    return Promise.reject(err);
  }
);
export async function initCsrf() {
  // Ensures csrf cookie exists before any POSTs (login/register/refresh/etc)
  await api.get("/auth/csrf");
}

export default api;