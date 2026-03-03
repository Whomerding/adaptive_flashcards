import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  createDeck,
  // ...
} from "../controllers/flashcards.controllers.js";

const router = Router();

// Usually, app endpoints are protected:

router.post("/decks", requireAuth, createDeck);

export default router;