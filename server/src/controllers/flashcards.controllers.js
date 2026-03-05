import { pool } from "../db.js";



/** helper: verify child belongs to logged-in parent */
async function assertChildOwnership(client, childId, parentId) {
  const r = await client.query(
    `SELECT id FROM children WHERE id = $1 AND parent_id = $2`,
    [childId, parentId]
  );
  if (r.rowCount === 0) {
    const err = new Error("Child not found");
    err.status = 404;
    throw err;
  }
}

export async function addChild(req, res, next) {
  try {
    const parentId = req.user.parentId; // set by requireAuth middleware
    const name = (req.body?.name || "").trim();
    if (!name) return res.status(400).json({ error: "Child name is required" });

    const r = await pool.query(
      `INSERT INTO children (parent_id, name)
       VALUES ($1, $2)
       RETURNING id, parent_id, name, created_at`,
      [parentId, name]
    );
const newChild = r.rows[0];
    res.status(201).json({ child: newChild });
  } catch (err) {
    next(err);
  }
}

export async function getChildren(req, res, next) {
  try {
    const parentId = req.user.parentId;

    const r = await pool.query(
      `SELECT id, parent_id, name, created_at
       FROM children
       WHERE parent_id = $1
       ORDER BY created_at ASC`,
      [parentId]
    );

    res.json({ children: r.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * Returns facts + progress for a child.
 * Uses child_fact_progress as the "join point", so you only see facts you've initialized progress for.
 * If you want "all facts whether progress exists or not", we can flip to facts LEFT JOIN progress.
 */
export async function getChildFacts(req, res, next) {
  const parentId = req.user.parentId;
  const childId = Number(req.params.childId);

  try {
    const client = await pool.connect();
    try {
      await assertChildOwnership(client, childId, parentId);

      const q = `
        SELECT
          f.id,
          f.prompt,
          f.answer,
          cfp.status,
          cfp.is_active,
          cfp.active_position,
          cfp.times_seen,
          cfp.times_correct,
          cfp.streak_correct,
          cfp.last_seen_at,
          cfp.next_due_at
        FROM child_fact_progress cfp
        JOIN facts f ON f.id = cfp.fact_id
        WHERE cfp.child_id = $1
        ORDER BY COALESCE(cfp.active_position, 999999) ASC, f.id ASC;
      `;

      const r = await client.query(q, [childId]);
      res.json({ facts: r.rows });
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
}

export async function getChildDeckById(req, res, next) {
  const parentId = req.user.parentId;
  const childId = Number(req.params.childId);
  const deckId = Number(req.params.deckId);

  if (!Number.isFinite(childId) || !Number.isFinite(deckId)) {
    return res.status(400).json({ error: "Invalid childId or deckId" });
  }

  try {
    const client = await pool.connect();
    try {
      await assertChildOwnership(client, childId, parentId);

      // Look for an enabled deck state for THIS child + THIS deck
      const deckState = await client.query(
        `SELECT cds.child_id, cds.deck_id, cds.next_position, cds.is_enabled, cds.created_at,
                d.name as deck_name, d.subject
         FROM child_deck_state cds
         JOIN decks d ON d.id = cds.deck_id
         WHERE cds.child_id = $1
           AND cds.deck_id = $2
           AND cds.is_enabled = true
         ORDER BY cds.created_at DESC
         LIMIT 1`,
        [childId, deckId]
      );

      if (deckState.rowCount === 0) {
        // Deck isn't enabled/created for this child yet
        return res.json({ deck: null, facts: [] });
      }

      const facts = await client.query(
        `SELECT f.id, f.prompt, f.answer, df.position
         FROM deck_facts df
         JOIN facts f ON f.id = df.fact_id
         WHERE df.deck_id = $1
         ORDER BY df.position ASC`,
        [deckId]
      );

      res.json({ deck: deckState.rows[0], facts: facts.rows });
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
}

export async function ensureChildDeck(req, res, next) {
  const parentId = req.user.parentId;
  const childId = Number(req.params.childId);
  const deckId = Number(req.params.deckId);

  try {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      await assertChildOwnership(client, childId, parentId);

      const existing = await client.query(
        `SELECT * FROM child_deck_state
         WHERE child_id = $1
         AND deck_id = $2
         AND is_enabled = true`,
        [childId, deckId]
      );

      if (existing.rowCount) {
        await client.query("COMMIT");
        return res.json({ created: false, deck: existing.rows[0] });
      }

      await client.query(
        `INSERT INTO child_fact_progress
         (child_id, fact_id, status, is_active, times_seen, times_correct, streak_correct)
         SELECT $1, fact_id, 'new', true, 0, 0, 0
         FROM deck_facts
         WHERE deck_id = $2
         ON CONFLICT (child_id, fact_id) DO NOTHING`,
        [childId, deckId]
      );

      await client.query(
        `INSERT INTO child_deck_state
         (child_id, deck_id, next_position, is_enabled)
         VALUES ($1, $2, 1, true)`,
        [childId, deckId]
      );

      await client.query("COMMIT");

      res.status(201).json({ created: true });

    } catch (err) {
      await client.query("ROLLBACK");
      next(err);
    } finally {
      client.release();
    }

  } catch (err) {
    next(err);
  }
}