// src/controllers/flashcard.controllers.js
import { pool } from "../db.js";

// GET /api/deck/:id
export async function createDeck(req, res, next) {
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

    const result = await pool.query(q, [deckId]);
    res.json({ facts: result.rows });
  } catch (err) {
    next(err);
  }
}