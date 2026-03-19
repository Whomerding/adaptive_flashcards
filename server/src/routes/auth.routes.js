
import { Router } from "express";
import passport from "passport";
import { cookieOptions } from "../utils/cookies.js";
import jwt from "jsonwebtoken";

import {
  loginLimiter,
  signupLimiter,
  passwordResetRequestLimiter,
  passwordResetConfirmLimiter,
} from "../middleware/rateLimits.js";

import {
  requestPasswordReset,
  resetPassword,
  register,
  login,
  logout,
  me,
  getCsrf,
  refresh,
  updateBirthDate,
} from "../controllers/auth.controllers.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireCsrf } from "../middleware/csrf.js";


const router = Router();

router.post("/register", requireCsrf, signupLimiter, register);
router.post("/login", requireCsrf, loginLimiter, login);
router.post("/logout", requireCsrf, logout);
router.post("/refresh", requireCsrf, refresh);
router.get("/csrf", getCsrf);
router.post("/forgot-password", passwordResetRequestLimiter, requestPasswordReset);
router.post("/reset-password", passwordResetConfirmLimiter, resetPassword);
router.patch("/me/birth_date", requireAuth, updateBirthDate);
// Example: an auth-only endpoint to verify cookie/jwt
router.get("/me", requireAuth, me);


// Google OAuth routes

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["openid", "email", "profile"],
    session: false,
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL}/login?error=google_auth_failed`,
  }),
  async (req, res) => {
    const parent = req.user;

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
      ...cookieOptions(),
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refresh_token", refreshToken, {
      ...cookieOptions(),
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    if (!parent.birth_date) {
      return res.redirect(`${process.env.CLIENT_URL}/complete-profile`);
    }
    return res.redirect(`${process.env.CLIENT_URL}/dashboard`);
  }
);
export default router;