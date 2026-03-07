import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireCsrf } from "../middleware/csrf.js";

import {
  addChild,
  getChildren,
  getChildDeckSession,
  ensureChildDeck,
  deleteChild,
  batchUpdateChildFactProgress,
} from "../controllers/flashcards.controllers.js";

const router = Router();

router.post("/children", requireAuth, requireCsrf, addChild);
router.get("/children", requireAuth, getChildren);
router.post("/children/:childId/decks/:deckId/batch-progress",requireAuth, batchUpdateChildFactProgress);

router.delete("/children/:childId", requireAuth, requireCsrf, deleteChild);

router.get("/children/:childId/decks/:deckId/session", requireAuth, getChildDeckSession);
router.post("/children/:childId/decks/:deckId/ensure", requireAuth, ensureChildDeck);

export default router;