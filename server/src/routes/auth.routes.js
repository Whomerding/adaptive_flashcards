import { Router } from "express";
import {
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

router.post("/register", requireCsrf, register);
router.post("/login", requireCsrf, login);
router.post("/logout", requireCsrf, logout);
router.post("/refresh", requireCsrf, refresh);
router.get("/csrf", getCsrf);

// Example: an auth-only endpoint to verify cookie/jwt
router.get("/me", requireAuth, me);

export default router;