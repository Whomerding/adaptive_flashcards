// src/controllers/auth.controllers.js
import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";
import { cookieOptions } from "../utils/cookies.js";
import { sendPasswordResetEmail } from "../utils/mailer.js";
import passport from "passport";
import {Strategy as GoogleStrategy} from "passport-google-oauth20"; 

const saltRounds = 10;

// GET /auth/csrf
export function getCsrf(req, res) {
  const isProd = process.env.NODE_ENV === "production";
  const csrf = crypto.randomBytes(32).toString("hex");

  res.cookie("csrf_token", csrf, {
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge: 2 * 60 * 60 * 1000,
  });

  res.json({ csrfToken: csrf });
}

// GET /auth/me (requireAuth)
export async function me(req, res, next) {
  try {
    const { parentId } = req.user;

    const r = await pool.query("SELECT id, email, birth_date FROM parents WHERE id = $1", [
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
    const birth_date = req.body.birth_date || null;

    if (!email) return res.status(400).json({ error: "Email is required" });

    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters" });
    }

    if (!birth_date) {
      return res.status(400).json({ error: "Birth date is required" });
    }

    const parsedBirthDate = new Date(birth_date);
    if (isNaN(parsedBirthDate.getTime())) {
      return res.status(400).json({ error: "Invalid birth date" });
    }

    if (parsedBirthDate > new Date()) {
      return res.status(400).json({ error: "Birth date cannot be in the future" });
    }

    const existing = await pool.query(
      "SELECT id FROM parents WHERE email=$1",
      [email]
    );

    if (existing.rows.length) {
      return res.status(409).json({ error: "Account already exists" });
    }

    const password_hash = await bcrypt.hash(password, saltRounds);

    const created = await pool.query(
      `INSERT INTO parents (email, password_hash, birth_date)
       VALUES ($1, $2, $3)
       RETURNING id, email, birth_date`,
      [email, password_hash, birth_date]
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
      "SELECT id, email, password_hash, birth_date FROM parents WHERE email=$1",
      [email]
    );

    const parent = result.rows[0];
    if (!parent) return res.status(401).json({ error: "Invalid credentials" });

    if (!parent.password_hash) {
    return res.status(401).json({ error: "Use Google sign-in for this account" });
}

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

    res.json({ parent: { id: parent.id, email: parent.email, birth_date: parent.birth_date } });
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





export async function requestPasswordReset(req, res, next) {
  const { email } = req.body;

  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Email is required." });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const genericMessage =
    "If an account with that email exists, a password reset link has been sent.";

  try {
    const parentResult = await pool.query(
      `SELECT id, email
       FROM parents
       WHERE email = $1`,
      [normalizedEmail]
    );

    // Prevent email enumeration
    if (parentResult.rows.length === 0) {
      return res.status(200).json({ message: genericMessage });
    }

    const parent = parentResult.rows[0];

    // Generate secure token
    const rawToken = crypto.randomBytes(32).toString("hex");

    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    // Remove any previous reset tokens
    await pool.query(
      `DELETE FROM password_reset_tokens
       WHERE parent_id = $1`,
      [parent.id]
    );

    await pool.query(
      `INSERT INTO password_reset_tokens (parent_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [parent.id, tokenHash, expiresAt]
    );

    const resetUrl =
      `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`;

    await sendPasswordResetEmail({
      to: parent.email,
      resetUrl
    });

    return res.status(200).json({ message: genericMessage });

  } catch (err) {
    next(err);
  }
}


export async function resetPassword(req, res, next) {
  const { token, newPassword } = req.body;

  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "Reset token is required." });
  }

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({
      error: "Password must be at least 8 characters.",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const tokenResult = await client.query(
      `SELECT id, parent_id
       FROM password_reset_tokens
       WHERE token_hash = $1
         AND expires_at > NOW()
       LIMIT 1`,
      [tokenHash]
    );

    if (tokenResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "This reset link is invalid or expired.",
      });
    }

    const resetTokenId = tokenResult.rows[0].id;
    const parentId = tokenResult.rows[0].parent_id;

    const passwordHash = await bcrypt.hash(newPassword, 12);

    const updateResult = await client.query(
      `UPDATE parents
       SET password_hash = $1
       WHERE id = $2`,
      [passwordHash, parentId]
    );

    if (updateResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        error: "Parent account not found.",
      });
    }

    await client.query(
      `DELETE FROM password_reset_tokens
       WHERE id = $1`,
      [resetTokenId]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      message: "Password reset successful.",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
}

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const email = (profile.emails?.[0]?.value || "").trim().toLowerCase();

        if (!email) {
          return done(new Error("Google account did not provide an email."));
        }

        const client = await pool.connect();

        try {
          await client.query("BEGIN");

          // 1) Already linked?
          const linked = await client.query(
            `SELECT p.id, p.email, p.birth_date
             FROM parent_oauth_accounts poa
             JOIN parents p ON p.id = poa.parent_id
             WHERE poa.provider = $1
               AND poa.provider_user_id = $2
             LIMIT 1`,
            ["google", googleId]
          );

          if (linked.rows.length > 0) {
            await client.query("COMMIT");
            return done(null, linked.rows[0]);
          }

          // 2) Existing parent with same email?
          const existingParent = await client.query(
            `SELECT id, email, birth_date
             FROM parents
             WHERE email = $1
             LIMIT 1`,
            [email]
          );

          let parent;

          if (existingParent.rows.length > 0) {
            parent = existingParent.rows[0];
          } else {
            // 3) Create new parent
            const createdParent = await client.query(
              `INSERT INTO parents (email, password_hash, birth_date)
               VALUES ($1, NULL, NULL)
               RETURNING id, email, birth_date`,
              [email]
            );
            parent = createdParent.rows[0];
          }

          // Link Google account
          await client.query(
            `INSERT INTO parent_oauth_accounts
               (parent_id, provider, provider_user_id, email)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (provider, provider_user_id) DO NOTHING`,
            [parent.id, "google", googleId, email]
          );

          await client.query("COMMIT");
          return done(null, parent);
        } catch (err) {
          await client.query("ROLLBACK");
          return done(err);
        } finally {
          client.release();
        }
      } catch (err) {
        return done(err);
      }
    }
  )
);

// PATCH /auth/me/birth-date (requireAuth)
export async function updateBirthDate(req, res, next) {
  console.log("updateBirthDate called with body:", req.body);
  try {
    const { parentId } = req.user;
    const birth_date = req.body.birth_date || null;

    if (!birth_date) {
      return res.status(400).json({ error: "Birth date is required" });
    }

    const parsedBirthDate = new Date(birth_date);
    if (isNaN(parsedBirthDate.getTime())) {
      return res.status(400).json({ error: "Invalid birth date" });
    }

    if (parsedBirthDate > new Date()) {
      return res
        .status(400)
        .json({ error: "Birth date cannot be in the future" });
    }

    const updated = await pool.query(
      `UPDATE parents
       SET birth_date = $1
       WHERE id = $2
       RETURNING id, email, birth_date`,
      [birth_date, parentId]
    );

    if (!updated.rows.length) {
      return res.status(404).json({ error: "Parent not found" });
    }

    res.json({ parent: updated.rows[0] });
  } catch (err) {
    next(err);
  }
}