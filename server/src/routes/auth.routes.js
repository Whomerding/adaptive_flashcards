import express from "express";
import { Router } from "express";
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

// Example: an auth-only endpoint to verify cookie/jwt
router.get("/me", requireAuth, me);

export default router;