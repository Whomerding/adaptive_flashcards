// src/controllers/auth.controllers.js
import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { pool } from "../db.js";
import { cookieOptions } from "../utils/cookies.js";

const saltRounds = 10;

// GET /auth/csrf
export function getCsrf(req, res) {
  const isProd = process.env.NODE_ENV === "production";
  const csrf = crypto.randomBytes(32).toString("hex");

  // For double-submit CSRF, cookie should be readable by JS (no httpOnly)
  res.cookie("csrf_token", csrf, {
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
  });

  res.json({ csrfToken: csrf });
}

// GET /auth/me (requireAuth)
export async function me(req, res, next) {
  try {
    const { parentId } = req.user;

    const r = await pool.query("SELECT id, email FROM parents WHERE id = $1", [
      parentId,
    ]);

    res.json({ parent: r.rows[0] });
  } catch (err) {
    next(err);
  }
}

// POST /auth/register
export async function register(req, res, next) {
  const isProd = process.env.NODE_ENV === "production";

  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const password = req.body.password || "";

    if (!email) return res.status(400).json({ error: "Email is required" });
    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters" });
    }

    const existing = await pool.query("SELECT id FROM parents WHERE email=$1", [
      email,
    ]);
    if (existing.rows.length) {
      return res.status(409).json({ error: "Account already exists" });
    }

    const password_hash = await bcrypt.hash(password, saltRounds);

    const created = await pool.query(
      "INSERT INTO parents (email, password_hash) VALUES ($1, $2) RETURNING id, email",
      [email, password_hash]
    );

    const parent = created.rows[0];

    const accessToken = jwt.sign(
      { parentId: parent.id },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_TTL || "15m" }
    );

    const refreshToken = jwt.sign(
      { parentId: parent.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_TTL || "30d" }
    );

    res.cookie("access_token", accessToken, {
      ...cookieOptions(isProd),
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refresh_token", refreshToken, {
      ...cookieOptions(isProd),
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({ parent });
  } catch (err) {
    next(err);
  }
}

// POST /auth/login
export async function login(req, res, next) {
  const isProd = process.env.NODE_ENV === "production";

  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const password = req.body.password || "";

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const result = await pool.query(
      "SELECT id, email, password_hash FROM parents WHERE email=$1",
      [email]
    );

    const parent = result.rows[0];
    if (!parent) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, parent.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const accessToken = jwt.sign(
      { parentId: parent.id },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_TTL || "15m" }
    );

    const refreshToken = jwt.sign(
      { parentId: parent.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_TTL || "30d" }
    );

    res.cookie("access_token", accessToken, {
      ...cookieOptions(isProd),
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refresh_token", refreshToken, {
      ...cookieOptions(isProd),
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({ parent: { id: parent.id, email: parent.email } });
  } catch (err) {
    next(err);
  }
}

// POST /auth/logout
export function logout(req, res) {
  const isProd = process.env.NODE_ENV === "production";

  res.clearCookie("access_token", cookieOptions(isProd));
  res.clearCookie("refresh_token", cookieOptions(isProd));
  res.clearCookie("csrf_token", { path: "/" });

  res.json({ ok: true });
}

// POST /auth/refresh
export function refresh(req, res) {
  const isProd = process.env.NODE_ENV === "production";
  const refreshToken = req.cookies?.refresh_token;

  if (!refreshToken) {
    return res.status(401).json({ error: "Missing refresh token" });
  }

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const newAccess = jwt.sign(
      { parentId: payload.parentId },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_TTL || "15m" }
    );

    res.cookie("access_token", newAccess, {
      ...cookieOptions(isProd),
      maxAge: 15 * 60 * 1000,
    });

    res.json({ ok: true });
  } catch {
    return res.status(401).json({ error: "Invalid refresh token" });
  }
}




export function getCsrfToken(req, res) {
  const isProd = process.env.NODE_ENV === "production";
  const csrf = crypto.randomBytes(32).toString("hex");

  res.cookie("csrf_token", csrf, {
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
  });

  res.json({ csrfToken: csrf });
}

