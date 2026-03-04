import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireCsrf } from "../middleware/csrf.js";

import {
  addChild,
  getChildren,
  getChildFacts,
  getChildDeckById,
  ensureChildDeck,
} from "../controllers/flashcards.controllers.js";

const router = Router();

router.post("/children", requireAuth, requireCsrf, addChild);
router.get("/children", requireAuth, getChildren);

router.get("/children/:childId/facts", requireAuth, getChildFacts);

router.get("/children/:childId/decks/:deckId", requireAuth, getChildDeckById); 
router.post("/children/:childId/decks/:deckId/ensure", requireAuth, ensureChildDeck);

export default router;