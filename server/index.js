import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { pool } from "./db.js";
import crypto from "crypto";



const app = express();
const port = 5050;
const saltRounds = 10;

app.use(express.json());
app.use(cookieParser());

app.use(cors({
  origin: "http://localhost:3000",  
  credentials: true,
}));

function cookieOptions(isProd) {
  return {
    httpOnly: true,
    secure: isProd,        
    sameSite: isProd ? "none" : "lax", 
    path: "/",
  };
}
  

function requireAuth(req, res, next) {
  const token = req.cookies?.access_token;
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = payload; // { parentId }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid/expired token" });
  }
}

function requireCsrf(req, res, next) {
  const csrfCookie = req.cookies?.csrf_token;
  const csrfHeader = req.headers["x-csrf-token"];
  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return res.status(403).json({ error: "CSRF check failed" });
  }
  next();
}



app.get("/auth/csrf", (req, res) => {
  const isProd = process.env.NODE_ENV === "production";
  const csrf = crypto.randomBytes(32).toString("hex");

  res.cookie("csrf_token", csrf, {
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
  });

  res.json({ csrfToken: csrf });
});


app.get("/deck/:id", async (req, res, next) => {
  const deckId = req.params.id;
  try {
    const q = `
      SELECT f.id, f.prompt, f.answer, df.position
      FROM decks d
      JOIN deck_facts df ON d.id = df.deck_id
      JOIN facts f ON df.fact_id = f.id
      WHERE d.id = $1
      ORDER BY df.position;
    `;
    const result = await pool.query(q, [req.params.id]);
    res.json({ facts: result.rows });
  } catch (err) {
    next(err);
  }
});

// Who am I (protected)
app.get("/auth/me", requireAuth, async (req, res, next) => {
  try {
    const { parentId } = req.user;
    const r = await pool.query("SELECT id, email FROM parents WHERE id = $1", [
      parentId,
    ]);
    res.json({ parent: r.rows[0] });
  } catch (err) {
    next(err);
  }
});

// Register (create parent, then set cookies like login)
app.post("/auth/register", async (req, res, next) => {
  const isProd = process.env.NODE_ENV === "production";

  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const password = req.body.password || "";

    if (!email) return res.status(400).json({ error: "Email is required" });
    if (password.length < 8)
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters" });

    const existing = await pool.query("SELECT id FROM parents WHERE email=$1", [
      email,
    ]);
    if (existing.rows.length)
      return res.status(409).json({ error: "Account already exists" });

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
});

// Login (set cookies)
app.post("/auth/login", async (req, res, next) => {
  const isProd = process.env.NODE_ENV === "production";

  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const password = req.body.password || "";

    if (!email || !password)
      return res.status(400).json({ error: "Email and password required" });

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
});

app.post("/auth/logout", (req, res) => {
  const isProd = process.env.NODE_ENV === "production";

  res.clearCookie("access_token", cookieOptions(isProd));
  res.clearCookie("refresh_token", cookieOptions(isProd));
  res.clearCookie("csrf_token", { path: "/" });

  res.json({ ok: true });
});

app.post("/auth/refresh", (req, res) => {
  const isProd = process.env.NODE_ENV === "production";
  const refresh = req.cookies?.refresh_token;

  if (!refresh) return res.status(401).json({ error: "Missing refresh token" });

  try {
    const payload = jwt.verify(refresh, process.env.JWT_REFRESH_SECRET);

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
});

// Basic error handler so next(err) returns JSON
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Server error" });
});


   app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});