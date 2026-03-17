import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  const [activeCards, setActiveCards] = React.useState([]);
  const [reserveCards, setReserveCards] = React.useState([]);
  const [currentCardIndex, setCurrentCardIndex] = React.useState(0);
  const [pendingResults, setPendingResults] = React.useState([]);
  const [sessionFinished, setSessionFinished] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState("");
  const [cardStartedAt, setCardStartedAt] = React.useState(null);

  const [showInactivityPrompt, setShowInactivityPrompt] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const pendingResultsRef = React.useRef([]);
  const isFlushingRef = React.useRef(false);
  const prevPathRef = React.useRef(location.pathname);

  const inactivityWarningTimerRef = React.useRef(null);
  const inactivityEndTimerRef = React.useRef(null);
  const sessionEndedRef = React.useRef(false);
  const consecutiveTimeoutsRef = React.useRef(0);

  const BATCH_SIZE = 20;
  const ACTIVE_TARGET = session?.sessionConfig?.activeTarget ?? 12;

  const INACTIVITY_LIMIT = 15 * 1000;
  const WARNING_GRACE_PERIOD = 10 * 1000;

  function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  React.useEffect(() => {
  if (!session) return;

  const mode = session.sessionConfig?.mode ?? "adaptive";
  const orderedCards = Array.isArray(session.cards) ? session.cards : [];

  if (mode === "review") {
    setActiveCards(shuffle(orderedCards));
    setReserveCards([]);
  } else {
    const initialActive = shuffle(orderedCards.slice(0, ACTIVE_TARGET));
    const initialReserve = orderedCards.slice(ACTIVE_TARGET);

    setActiveCards(initialActive);
    setReserveCards(initialReserve);
  }

  setCurrentCardIndex(0);

  setPendingResults([]);
  pendingResultsRef.current = [];

  setSessionFinished(false);
  setSubmitError("");
  setCardStartedAt(Date.now());
  setShowInactivityPrompt(false);
  setIsPaused(false);

  sessionEndedRef.current = false;
  consecutiveTimeoutsRef.current = 0;
}, [session, ACTIVE_TARGET]);

  React.useEffect(() => {
    pendingResultsRef.current = pendingResults;
  }, [pendingResults]);

  const currentCard = activeCards[currentCardIndex] ?? null;

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

  async function flushPendingResults() {
    const resultsToSend = [...pendingResultsRef.current];
    if (!resultsToSend.length) return;

    await flushBatch(resultsToSend);

    pendingResultsRef.current = [];
    setPendingResults([]);
  }

  function flushPendingResultsOnLeave() {
    const resultsToSend = [...pendingResultsRef.current];
    if (!resultsToSend.length) return;

    console.log(
      `Attempting to flush pending results on leave for child ${childId} deck ${deckId}...`
    );
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

  async function maybeFlushLargeBatch() {
    const resultsToSend = [...pendingResultsRef.current];
    if (resultsToSend.length < BATCH_SIZE) return;

    await flushBatch(resultsToSend);
    pendingResultsRef.current = [];
    setPendingResults([]);
  }

  function clearInactivityTimers() {
    if (inactivityWarningTimerRef.current) {
      clearTimeout(inactivityWarningTimerRef.current);
      inactivityWarningTimerRef.current = null;
    }

    if (inactivityEndTimerRef.current) {
      clearTimeout(inactivityEndTimerRef.current);
      inactivityEndTimerRef.current = null;
    }
  }

  function endSessionDueToInactivity() {
    if (sessionEndedRef.current) return;
    sessionEndedRef.current = true;

    clearInactivityTimers();
    setShowInactivityPrompt(false);
    setIsPaused(true);

    flushPendingResultsOnLeave();
    setSessionFinished(true);

    alert("Game ended due to inactivity.");
    navigate("/dashboard");
  }

  function pauseForInactivity() {
    if (sessionEndedRef.current || sessionFinished) return;

    clearInactivityTimers();
    setShowInactivityPrompt(true);
    setIsPaused(true);

    inactivityEndTimerRef.current = setTimeout(() => {
      endSessionDueToInactivity();
    }, WARNING_GRACE_PERIOD);
  }

  function resetInactivityTimer() {
    if (sessionEndedRef.current || sessionFinished || isPaused) return;

    clearInactivityTimers();

    inactivityWarningTimerRef.current = setTimeout(() => {
      pauseForInactivity();
    }, INACTIVITY_LIMIT);
  }

  function handleResumeAfterPause() {
    if (sessionEndedRef.current) return;

    clearInactivityTimers();
    setShowInactivityPrompt(false);
    setIsPaused(false);
    setCardStartedAt(Date.now());
    consecutiveTimeoutsRef.current = 0;
    resetInactivityTimer();
  }

  async function handleCardResult({
    factId,
    correct,
    timedOut = false,
    typedAnswer = "",
  }) {
    if (isPaused || sessionEndedRef.current) return;

    const now = new Date().toISOString();
    const responseMs = cardStartedAt ? Date.now() - cardStartedAt : null;

    const answeredCard = activeCards[currentCardIndex];
    if (!answeredCard) return;

    const currentTimesSeen = Number(answeredCard.times_seen ?? 0);
    const currentTimesCorrect = Number(answeredCard.times_correct ?? 0);
    const currentStreakCorrect = Number(answeredCard.streak_correct ?? 0);
    const mode = session?.sessionConfig?.mode ?? "adaptive";
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

    if (timedOut) {
      consecutiveTimeoutsRef.current += 1;
    } else {
      consecutiveTimeoutsRef.current = 0;
    }

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

    if (mode === "review") {
  nextActive.splice(currentCardIndex, 1);
  nextActive.push(updatedAnsweredCard);

  if (currentCardIndex >= nextActive.length) {
    nextIndex = 0;
  } else {
    nextIndex = currentCardIndex;
  }
} else if (mastered) {
  nextActive = nextActive.filter((card) => card.id !== factId);

  const refill = refillActiveCards(nextActive, nextReserve);
  nextActive = refill.active;
  nextReserve = refill.reserve;

  if (nextIndex >= nextActive.length) {
    nextIndex = 0;
  }
} else {
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
        clearInactivityTimers();
        setSessionFinished(true);
      } catch (err) {
        // leave pending intact if save fails
      }
      return;
    }

    try {
      await maybeFlushLargeBatch();
    } catch (err) {
      // leave pending intact if save fails
    }

    if (consecutiveTimeoutsRef.current >= 2) {
      pauseForInactivity();
      return;
    }

    resetInactivityTimer();
  }

  React.useEffect(() => {
    const activityEvents = ["click", "keydown", "touchstart", "mousemove"];

    function handleActivity() {
      if (showInactivityPrompt || sessionFinished || sessionEndedRef.current) {
        return;
      }

      resetInactivityTimer();
    }

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity);
    });

    resetInactivityTimer();

    return () => {
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
      clearInactivityTimers();
    };
  }, [showInactivityPrompt, sessionFinished, isPaused]);

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
        pauseForInactivity();
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
  }, [childId, deckId, sessionFinished]);

  React.useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      flushPendingResultsOnLeave();
    }

    prevPathRef.current = location.pathname;
  }, [location.pathname, childId, deckId]);

  React.useEffect(() => {
    return () => {
      clearInactivityTimers();
      flushPendingResultsOnLeave();
    };
  }, [childId, deckId]);

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
    <div style={{ position: "relative" }}>
      {showInactivityPrompt && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "1.5rem",
              borderRadius: "12px",
              maxWidth: "400px",
              width: "90%",
              textAlign: "center",
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            }}
          >
            <h3>Are you still there?</h3>
            <p>Your game is paused so your score does not get messed up.</p>
            <p>Press continue to keep playing.</p>
            <button onClick={handleResumeAfterPause}>Continue Game</button>
          </div>
        </div>
      )}

      <Flashcard
        key={currentCard.id}
        card={currentCard}
        isSubmitting={isSubmitting}
        canSaveProgress={pendingResults.length > 0}
        timeLimitSeconds={8}
        isPaused={isPaused}
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