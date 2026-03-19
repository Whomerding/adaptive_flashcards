import axios from "axios";

let csrfToken = null;

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5050",
  withCredentials: true,
});

// attach csrf header automatically for mutating requests
api.interceptors.request.use((config) => {
  const method = (config.method || "get").toLowerCase();
  const isMutating = ["post", "put", "patch", "delete"].includes(method);

  if (isMutating && csrfToken) {
    config.headers["X-CSRF-Token"] = csrfToken;
  }

  return config;
});

let refreshPromise = null;

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = api.post("/auth/refresh").finally(() => {
      refreshPromise = null;
    });
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
  try {
    const res = await api.get("/auth/csrf");
    csrfToken = res.data.csrfToken;
  } catch (err) {
    console.error("CSRF init failed:", err);
    throw err;
  }
}

export default api;