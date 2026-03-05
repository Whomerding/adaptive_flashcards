import api, { initCsrf } from "./axiosConfig";

export async function bootstrapAuth() {
  await initCsrf();
  try {
    const res = await api.get("/auth/me");
    return res.data; // { parent: ... }
  } catch (e) {
    // If not logged in yet, /me will 401 - that's OK.
    if (e?.response?.status === 401) return null;
    throw e;
  }
}

export async function login(email, password) {
  await initCsrf(); // make sure csrf cookie exists
  const res = await api.post("/auth/login", { email, password });
  return res.data; // { parent: {...} }
}

export async function register(email, password) {
  await initCsrf();
  const res = await api.post("/auth/register", { email, password });
  return res.data; // { parent: {...} }
}

export async function logout() {
  await initCsrf();
  const res = await api.post("/auth/logout");
  return res.data; // { ok: true }
}

export async function me() {
  const res = await api.get("/auth/me");
  return res.data; // { parent: {...} }
}