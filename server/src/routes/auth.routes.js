import { Router } from "express";
import {
  register,
  login,
  logout,
  me,
  getCsrf
} from "../controllers/auth.controllers.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireCsrf } from "../middleware/csrf.js";


const router = Router();

router.post("/register",  register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/csrf", getCsrf);

// Example: an auth-only endpoint to verify cookie/jwt
router.get("/me", requireAuth, me);

export default router;