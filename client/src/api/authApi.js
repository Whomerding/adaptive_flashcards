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
  try {
    await initCsrf(); // ensure csrf cookie exists
    const res = await api.post("/auth/login", { email, password });
    return res.data; // { parent: {...} }
  } catch (err) {
    console.error("Login error:", err);

    const message =
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message ||
      "Login failed";

    const error = new Error(message);
    error.userMessage = message;
    error.original = err;
    throw error;
  }
}

export async function register(email, password, birthday) {
  await initCsrf();
  try {
    const res = await api.post("/auth/register", {
      email,
      password,
      birth_date: birthday,
    });
    return res.data;
  } catch (err) {
    throw new Error(
      err.response?.data?.message ||
        err.response?.data?.error ||
        "Registration failed"
    );
  }
}

export async function logout() {
  try {
    await initCsrf();
    const res = await api.post("/auth/logout");
    return res.data; // { ok: true }
  } catch (err) {
    console.error("Logout error:", err);

    const message =
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message ||
      "Logout failed";

    const error = new Error(message);
    error.userMessage = message;
    error.original = err;
    throw error;
  }
}

export async function me() {
  try {
    const res = await api.get("/auth/me");
    return res.data;
  } catch (err) {
    if (err.response?.status === 401) {
      return null;
    }

    console.error("Me error:", err);

    const error = new Error("Failed to fetch user");
    error.userMessage = "Failed to fetch user";
    error.original = err;
    throw error;
  }
}