import { pool } from "../db.js";

//CHILDREN FUNCTIONS//

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
    const parentId = req.user.parentId;
    const name = (req.body?.name || "").trim();
    const avatar = req.body?.avatar || "red-dragon";

    if (!name) {
      return res.status(400).json({ error: "Child name is required" });
    }

    const r = await pool.query(
      `INSERT INTO children (parent_id, name, avatar)
       VALUES ($1, $2, $3)
       RETURNING id, parent_id, name, avatar, created_at`,
      [parentId, name, avatar]
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
      `SELECT id, parent_id, name, avatar, created_at
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

export async function deleteChild(req, res, next) {
  try {
    const parentId = req.user.parentId;
    const childId = Number(req.params.childId);
    const birth_date = req.body.birth_date || null;

    if (!Number.isInteger(childId) || childId <= 0) {
      return res.status(400).json({ error: "Invalid child id" });
    }

    if (!birth_date) {
      return res.status(400).json({ error: "Birth date is required" });
    }

    const parsedBirthDate = new Date(birth_date);
    if (isNaN(parsedBirthDate.getTime())) {
      return res.status(400).json({ error: "Invalid birth date" });
    }

    const authCheck = await pool.query(
      `
      SELECT 1
      FROM parents
      WHERE id = $1
        AND birth_date = $2
      `,
      [parentId, birth_date]
    );

    if (!authCheck.rows.length) {
      return res.status(403).json({ error: "Birthday verification failed" });
    }

    const ownershipCheck = await pool.query(
      `
      SELECT id
      FROM children
      WHERE id = $1
        AND parent_id = $2
      `,
      [childId, parentId]
    );

    if (!ownershipCheck.rows.length) {
      return res.status(404).json({ error: "Child not found" });
    }

    await pool.query(
      `
      DELETE FROM children
      WHERE id = $1
        AND parent_id = $2
      `,
      [childId, parentId]
    );

    return res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
}
/**
 * Returns facts + progress for a child.
 * Uses child_fact_progress as the "join point", so you only see facts you've initialized progress for.
 * If you want "all facts whether progress exists or not", we can flip to facts LEFT JOIN progress.
 */


export async function getChildDeckSession(req, res, next) {
  const parentId = req.user.parentId;
  const childId = Number(req.params.childId);
  const deckId = Number(req.params.deckId);

  const ACTIVE_TARGET = 12;
  const REVIEW_TARGET = 2;
  const REVIEW_MODE_THRESHOLD = 10;

  if (
    !Number.isInteger(childId) ||
    !Number.isInteger(deckId) ||
    childId <= 0 ||
    deckId <= 0
  ) {
    return res.status(400).json({ error: "Invalid childId or deckId" });
  }

  try {
    const client = await pool.connect();

    try {
      await assertChildOwnership(client, childId, parentId);

      const deckState = await client.query(
        `SELECT
           cds.*,
           d.name AS deck_name,
           d.subject
         FROM child_deck_state cds
         JOIN decks d
           ON d.id = cds.deck_id
         WHERE cds.child_id = $1
           AND cds.deck_id = $2
           AND cds.is_enabled = true
         ORDER BY cds.created_at DESC
         LIMIT 1`,
        [childId, deckId]
      );

      if (deckState.rowCount === 0) {
        return res.json({
          deck: null,
          cards: [],
          sessionConfig: {
            activeTarget: ACTIVE_TARGET,
            reviewTarget: REVIEW_TARGET,
            mode: "none",
          },
        });
      }

      const factsResult = await client.query(
        `SELECT
            f.id,
            f.prompt,
            f.answer,
            df.position,
            COALESCE(cfp.status, 'new') AS status,
            COALESCE(cfp.is_active, true) AS is_active,
            COALESCE(cfp.times_seen, 0) AS times_seen,
            COALESCE(cfp.times_correct, 0) AS times_correct,
            COALESCE(cfp.streak_correct, 0) AS streak_correct,
            COALESCE(cfp.reward_granted, false) AS reward_granted,
            cfp.last_seen_at,
            cfp.next_due_at
         FROM deck_facts df
         JOIN facts f
           ON f.id = df.fact_id
         LEFT JOIN child_fact_progress cfp
           ON cfp.fact_id = df.fact_id
          AND cfp.child_id = $2
         WHERE df.deck_id = $1
         ORDER BY df.position ASC`,
        [deckId, childId]
      );

      const allFacts = factsResult.rows;

      if (allFacts.length === 0) {
        return res.json({
          deck: deckState.rows[0],
          cards: [],
          sessionConfig: {
            activeTarget: ACTIVE_TARGET,
            reviewTarget: REVIEW_TARGET,
            mode: "empty",
          },
        });
      }

      const reviewCards = [];
      const learningCards = [];
      const newCards = [];
      const activeFacts = [];

      for (const fact of allFacts) {
        const status = fact.status ?? "new";

        if (fact.is_active !== false) {
          activeFacts.push(fact);
        }

        if (status === "mastered") {
          reviewCards.push(fact);
        } else if (status === "learning") {
          learningCards.push(fact);
        } else {
          newCards.push(fact);
        }
      }

      reviewCards.sort((a, b) => {
        const aTime = a.last_seen_at ? new Date(a.last_seen_at).getTime() : 0;
        const bTime = b.last_seen_at ? new Date(b.last_seen_at).getTime() : 0;
        return aTime - bTime;
      });

      const selectedReviews = reviewCards.slice(0, REVIEW_TARGET);

      const mode =
        activeFacts.length < REVIEW_MODE_THRESHOLD ? "review" : "adaptive";

      const cards =
        mode === "review"
          ? allFacts
          : [...selectedReviews, ...learningCards, ...newCards];

     const rewardCountResult = await client.query(
  `SELECT COUNT(*)::int AS total_rewards
   FROM child_fact_progress cfp
   JOIN deck_facts df
     ON df.fact_id = cfp.fact_id
   WHERE cfp.child_id = $1
     AND df.deck_id = $2
     AND cfp.reward_granted = true`,
  [childId, deckId]
);

const totalRewards = rewardCountResult.rows[0].total_rewards;
const STAGE_SIZE = 5;
const stage = Math.floor(totalRewards / STAGE_SIZE);
const nextUnlockAt = (stage + 1) * STAGE_SIZE;

      return res.json({
        deck: deckState.rows[0],
        sessionConfig: {
          activeTarget: ACTIVE_TARGET,
          reviewTarget: REVIEW_TARGET,
          mode,
        },
        rewardProgress: {
  totalRewards,
  stage,
  nextUnlockAt,
},
        cards,
      });
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
         (child_id, fact_id, status, is_active, times_seen, times_correct, streak_correct, reward_granted )
         SELECT $1, fact_id, 'new', true, 0, 0, 0, false
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

export async function batchUpdateChildFactProgress(req, res, next) {
  const parentId = req.user.parentId;
  const childId = Number(req.params.childId);
  const deckId = Number(req.params.deckId);
  const results = req.body?.results;

  const STAGE_SIZE = 5;

  if (!Number.isInteger(childId) || childId <= 0) {
    return res.status(400).json({ error: "Invalid childId" });
  }

  if (!Number.isInteger(deckId) || deckId <= 0) {
    return res.status(400).json({ error: "Invalid deckId" });
  }

  if (!Array.isArray(results) || results.length === 0) {
    return res.status(400).json({ error: "Results array is required" });
  }

  try {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      await assertChildOwnership(client, childId, parentId);

      const factIds = results.map((r) => Number(r.factId));

      if (factIds.some((id) => !Number.isInteger(id) || id <= 0)) {
        await client.query("ROLLBACK");
        return res
          .status(400)
          .json({ error: "One or more factIds are invalid" });
      }

      const factsInDeckResult = await client.query(
        `SELECT fact_id
         FROM deck_facts
         WHERE deck_id = $1
           AND fact_id = ANY($2::int[])`,
        [deckId, factIds]
      );

      const validFactIds = new Set(
        factsInDeckResult.rows.map((row) => row.fact_id)
      );
      const invalidFactIds = factIds.filter((id) => !validFactIds.has(id));

      if (invalidFactIds.length > 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: `These facts do not belong to deck ${deckId}`,
          invalidFactIds,
        });
      }

      // Ensure progress rows exist
      await client.query(
        `INSERT INTO child_fact_progress (
           child_id,
           fact_id,
           status,
           is_active,
           times_seen,
           times_correct,
           streak_correct,
           last_seen_at,
           next_due_at,
           reward_granted
         )
         SELECT
           $1,
           unnest($2::int[]),
           'new',
           true,
           0,
           0,
           0,
           NULL,
           NULL,
           false
         ON CONFLICT (child_id, fact_id) DO NOTHING`,
        [childId, factIds]
      );

      const beforeRewardCountResult = await client.query(
        `SELECT COUNT(*)::int AS total_rewards
         FROM child_fact_progress
         WHERE child_id = $1
           AND reward_granted = true`,
        [childId]
      );

      const rewardCountBefore = beforeRewardCountResult.rows[0].total_rewards;
      const rewardEvents = [];

      for (const result of results) {
        const factId = Number(result.factId);
        const correct = Boolean(result.correct);
        const timedOut = Boolean(result.timedOut);
        const seenAt = result.seenAt ? new Date(result.seenAt) : new Date();

        if (Number.isNaN(seenAt.getTime())) {
          throw new Error(`Invalid seenAt for factId ${factId}`);
        }

        const existingProgress = await client.query(
          `SELECT
             COALESCE(times_seen, 0) AS times_seen,
             COALESCE(times_correct, 0) AS times_correct,
             COALESCE(streak_correct, 0) AS streak_correct,
             COALESCE(status, 'new') AS status,
             COALESCE(reward_granted, false) AS reward_granted
           FROM child_fact_progress
           WHERE child_id = $1
             AND fact_id = $2`,
          [childId, factId]
        );

        if (existingProgress.rowCount === 0) {
          throw new Error(`Missing progress row for factId ${factId}`);
        }

        const current = existingProgress.rows[0];

        const newTimesSeen = Number(current.times_seen) + 1;
        const newTimesCorrect =
          Number(current.times_correct) + (correct ? 1 : 0);

        let newStreakCorrect;
        if (timedOut) {
          newStreakCorrect = 0;
        } else if (correct) {
          newStreakCorrect = Number(current.streak_correct) + 1;
        } else {
          newStreakCorrect = 0;
        }

        // Mastered if they have a streak of 3 correct
        const isMastered = newStreakCorrect >= 3;

        const newStatus = isMastered
          ? "mastered"
          : newTimesSeen > 0
            ? "learning"
            : "new";

        const isActive = !isMastered;

        const wasRewardGranted = Boolean(current.reward_granted);
        const becameMasteredNow =
          current.status !== "mastered" && newStatus === "mastered";
        const shouldGrantReward = becameMasteredNow && !wasRewardGranted;

        await client.query(
          `UPDATE child_fact_progress
           SET
             times_seen = $3,
             times_correct = $4,
             streak_correct = $5,
             last_seen_at = $6,
             status = $7,
             is_active = $8,
             reward_granted = CASE
               WHEN $9 = true THEN true
               ELSE reward_granted
             END
           WHERE child_id = $1
             AND fact_id = $2`,
          [
            childId,
            factId,
            newTimesSeen,
            newTimesCorrect,
            newStreakCorrect,
            seenAt.toISOString(),
            newStatus,
            isActive,
            shouldGrantReward,
          ]
        );

        if (shouldGrantReward) {
          rewardEvents.push({
            factId,
            type: "fact_mastered",
            awarded: true,
          });
        }
      }

      const rewardCountResult = await client.query(
        `SELECT COUNT(*)::int AS total_rewards
         FROM child_fact_progress
         WHERE child_id = $1
           AND reward_granted = true`,
        [childId]
      );

      const rewardCountAfter = rewardCountResult.rows[0].total_rewards;

      const stageBefore = Math.floor(rewardCountBefore / STAGE_SIZE);
      const stageAfter = Math.floor(rewardCountAfter / STAGE_SIZE);
      const unlockedNewStage = stageAfter > stageBefore;
      const nextUnlockAt = (stageAfter + 1) * STAGE_SIZE;

      await client.query("COMMIT");

      return res.json({
        success: true,
        processed: results.length,
        rewardProgress: {
          totalRewards: rewardCountAfter,
          stage: stageAfter,
          nextUnlockAt,
          unlockedNewStage,
        },
        rewardEvents,
      });
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