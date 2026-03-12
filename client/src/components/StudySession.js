import React from "react";
import { useLocation } from "react-router-dom";
import api from "../api/axiosConfig";
import Flashcard from "./Flashcard";
import { apiFetch } from "../utils/api";
export default function StudySession({
  session,
  childId,
  deckId,
  isLoading,
  error,
}) {
  /*
    UI state:
    - activeCards: the current shuffled pool shown to the child
    - reserveCards: ordered cards waiting to be pulled into active
    - currentCardIndex: which active card is currently displayed
    - pendingResults: mirrored UI copy of unsaved results
  */
  const [activeCards, setActiveCards] = React.useState([]);
  const [reserveCards, setReserveCards] = React.useState([]);
  const [currentCardIndex, setCurrentCardIndex] = React.useState(0);
  const [pendingResults, setPendingResults] = React.useState([]);
  const [sessionFinished, setSessionFinished] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState("");
  const [cardStartedAt, setCardStartedAt] = React.useState(null);

  /*
    Refs:
    - pendingResultsRef is the true source of truth for batching.
      We use a ref because state updates are async and batching logic
      needs the newest value immediately.
    - isFlushingRef prevents overlapping save calls.
    - prevPathRef helps detect React-router navigation changes.
  */
  const pendingResultsRef = React.useRef([]);
  const isFlushingRef = React.useRef(false);

  const location = useLocation();
  const prevPathRef = React.useRef(location.pathname);

  const BATCH_SIZE = 20;
  const ACTIVE_TARGET = session?.sessionConfig?.activeTarget ?? 12;

  /*
    Shuffle helper:
    We shuffle only the active pool.
    Reserve stays ordered so progression still follows deck order.
  */
  function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /*
    When a fresh session arrives from the backend:
    - first N cards become active and get shuffled
    - the rest go into reserve in order
  */
  React.useEffect(() => {
    if (!session) return;

    const orderedCards = session.cards ?? [];
    const initialActive = shuffle(orderedCards.slice(0, ACTIVE_TARGET));
    const initialReserve = orderedCards.slice(ACTIVE_TARGET);

    setActiveCards(initialActive);
    setReserveCards(initialReserve);
    setCurrentCardIndex(0);

    setPendingResults([]);
    pendingResultsRef.current = [];

    setSessionFinished(false);
    setSubmitError("");
    setCardStartedAt(Date.now());
  }, [session, ACTIVE_TARGET]);

  /*
    Keep the ref synchronized with state for UI-driven reads.
    The ref is what saving logic uses.
  */
  React.useEffect(() => {
    pendingResultsRef.current = pendingResults;
  }, [pendingResults]);

  const currentCard = activeCards[currentCardIndex] ?? null;

  /*
    Main API save function.
    Uses normal axios for standard save flows.
  */
  async function flushBatch(resultsToSend) {
    if (!resultsToSend.length) return;
    if (isFlushingRef.current) return;

    isFlushingRef.current = true;
    setIsSubmitting(true);
    setSubmitError("");

    try {
      const res = await api.post(
        `/api/children/${childId}/decks/${deckId}/batch-progress`,
        { results: resultsToSend }
      );
      console.log("batch save success:", res.data);
    } catch (err) {
      console.error("Failed to upload batch results:", err);
      console.error("Server response:", err.response?.data);
      console.error("Status:", err.response?.status);
      setSubmitError("Failed to save progress.");
      throw err;
    } finally {
      isFlushingRef.current = false;
      setIsSubmitting(false);
    }
  }

  /*
    Flush whatever is currently pending.
    This is used by:
    - manual save
    - autosave
    - session completion
  */
  async function flushPendingResults() {
    const resultsToSend = [...pendingResultsRef.current];
    if (!resultsToSend.length) return;

    await flushBatch(resultsToSend);

    pendingResultsRef.current = [];
    setPendingResults([]);
  }

  /*
    Route/unload-safe flush.
    We use fetch + keepalive so React-router redirects and page exits
    have a better chance to persist the data.
  */


function flushPendingResultsOnLeave() {
  console.log(`Attempting to flush pending results on leave for child ${childId} deck ${deckId}...`);
  const resultsToSend = [...pendingResultsRef.current];
  if (!resultsToSend.length) return;

  console.log("Flushing pending results on leave:", resultsToSend);

  apiFetch(`/api/children/${childId}/decks/${deckId}/batch-progress`, {
    method: "POST",
    keepalive: true,
    body: JSON.stringify({ results: resultsToSend }),
  }).catch((err) => {
    console.error("Failed to flush on leave:", err);
  });

  pendingResultsRef.current = [];
  setPendingResults([]);
}
  /*
    When a mastered card is removed, refill active from reserve.
    Active is reshuffled after refill so the new card is blended in.
  */
  function refillActiveCards(updatedActive, updatedReserve) {
    const nextActive = [...updatedActive];
    const nextReserve = [...updatedReserve];

    while (nextActive.length < ACTIVE_TARGET && nextReserve.length > 0) {
      nextActive.push(nextReserve.shift());
    }

    return {
      active: shuffle(nextActive),
      reserve: nextReserve,
    };
  }

  /*
    Auto-flush when batch size is reached.
  */
  async function maybeFlushLargeBatch() {
    const resultsToSend = [...pendingResultsRef.current];
    if (resultsToSend.length < BATCH_SIZE) return;

    await flushBatch(resultsToSend);
    pendingResultsRef.current = [];
    setPendingResults([]);
  }

  /*
    Main card result handler:
    - calculates local learning stats
    - updates UI immediately
    - appends to pending batch
    - optionally removes mastered cards and refills from reserve
  */
  async function handleCardResult({
    factId,
    correct,
    timedOut = false,
    typedAnswer = "",
  }) {
    if (!currentCard) return;

    const now = new Date().toISOString();
    const responseMs = cardStartedAt ? Date.now() - cardStartedAt : null;

    const answeredCard = activeCards[currentCardIndex];

    const currentTimesSeen = Number(answeredCard.times_seen ?? 0);
    const currentTimesCorrect = Number(answeredCard.times_correct ?? 0);
    const currentStreakCorrect = Number(answeredCard.streak_correct ?? 0);

    const updatedTimesSeen = currentTimesSeen + 1;
    const updatedTimesCorrect = currentTimesCorrect + (correct ? 1 : 0);

    let updatedStreakCorrect = 0;
    if (timedOut) {
      updatedStreakCorrect = 0;
    } else if (correct) {
      updatedStreakCorrect = currentStreakCorrect + 1;
    } else {
      updatedStreakCorrect = 0;
    }

    const mastered = updatedStreakCorrect >= 3;

    const result = {
      factId,
      correct,
      timedOut,
      mastered,
      typedAnswer,
      seenAt: now,
      responseMs,
    };

    const nextPending = [...pendingResultsRef.current, result];
    pendingResultsRef.current = nextPending;

    let nextActive = [...activeCards];
    let nextReserve = [...reserveCards];
    let nextIndex = currentCardIndex;

    const updatedAnsweredCard = {
      ...answeredCard,
      times_seen: updatedTimesSeen,
      times_correct: updatedTimesCorrect,
      streak_correct: updatedStreakCorrect,
      last_seen_at: now,
      status: mastered ? "mastered" : "learning",
      is_active: !mastered,
    };

    if (mastered) {
      nextActive = nextActive.filter((card) => card.id !== factId);

      const refill = refillActiveCards(nextActive, nextReserve);
      nextActive = refill.active;
      nextReserve = refill.reserve;

      if (nextIndex >= nextActive.length) {
        nextIndex = 0;
      }
    } else {
      /*
        For non-mastered cards:
        - move the answered card to the back
        - do NOT reshuffle every single answer, which can create jumpy UX
      */
      nextActive.splice(currentCardIndex, 1);
      nextActive.push(updatedAnsweredCard);

      if (currentCardIndex >= nextActive.length) {
        nextIndex = 0;
      } else {
        nextIndex = currentCardIndex;
      }
    }

    const noCardsLeft = nextActive.length === 0;

    setActiveCards(nextActive);
    setReserveCards(nextReserve);
    setCurrentCardIndex(nextIndex);
    setPendingResults(nextPending);
    setCardStartedAt(Date.now());

    if (noCardsLeft) {
      try {
        await flushPendingResults();
        setSessionFinished(true);
      } catch (err) {
        // leave pending results intact if save fails
      }
      return;
    }

    try {
      await maybeFlushLargeBatch();
    } catch (err) {
      // leave pending results intact if save fails
    }
  }

  /*
    Real browser exits:
    - refresh
    - tab close
    - full page navigation
  */
  React.useEffect(() => {
    function handlePageHide() {
      flushPendingResultsOnLeave();
    }

    function handleBeforeUnload() {
      flushPendingResultsOnLeave();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        flushPendingResultsOnLeave();
      }
    }

    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [childId, deckId]);

  /*
    React-router SPA navigation:
    beforeunload/pagehide usually won't fire here,
    so we flush when the pathname changes.
  */
  React.useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      flushPendingResultsOnLeave();
    }

    prevPathRef.current = location.pathname;
  }, [location.pathname, childId, deckId]);

  /*
    Also flush on unmount just in case the study component is removed
    without a full browser unload.
  */
  React.useEffect(() => {
    return () => {
      flushPendingResultsOnLeave();
    };
  }, [childId, deckId]);

  /*
    Autosave every 30 seconds while there are unsaved results.
  */
  React.useEffect(() => {
    if (!pendingResults.length) return;

    const interval = setInterval(() => {
      flushPendingResults().catch((err) => {
        console.error("Autosave failed:", err);
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [pendingResults]);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;
  if (!session?.deck) return <div>No deck found.</div>;

  if (sessionFinished) {
    return (
      <div>
        <h2>{session.deck.deck_name}</h2>
        <p>Session complete.</p>
        {submitError && <p>{submitError}</p>}
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div>
        <h2>{session.deck.deck_name}</h2>
        <p>No cards available.</p>
      </div>
    );
  }

  return (
    <div>
      <Flashcard
        key={currentCard.id}
        card={currentCard}
        isSubmitting={isSubmitting}
        canSaveProgress={pendingResults.length > 0}
        timeLimitSeconds={8}
        onSubmitAnswer={({ typedAnswer, correct }) =>
          handleCardResult({
            factId: currentCard.id,
            correct,
            typedAnswer,
          })
        }
        onTimedOut={() =>
          handleCardResult({
            factId: currentCard.id,
            correct: false,
            timedOut: true,
            typedAnswer: "",
          })
        }
        onSaveProgress={flushPendingResults}
      />
    </div>
  );
}