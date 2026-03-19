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

    // Normalize error so UI can use it cleanly
    const message =
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message ||
      "Login failed";

    // Throw a error object 
    throw {
      userMessage: message,
      original: err,
    };
  }
}

export async function register(email, password, birthday) {
  await initCsrf();
  try {
  const res = await api.post("/auth/register", {
    email,
    password,
    birth_date: birthday   // 👈 change here
  });
  return res.data;
} catch (err){
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

    throw {
      userMessage: message,
      original: err,
    };
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

    throw {
      userMessage: "Failed to fetch user",
      original: err,
    };
  }
}