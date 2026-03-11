import React from "react";
import api from "../api/axiosConfig";
import Flashcard from "./Flashcard";

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

  const pendingResultsRef = React.useRef([]);
  const isFlushingRef = React.useRef(false);

  const BATCH_SIZE = 20;
  const ACTIVE_TARGET = session?.sessionConfig?.activeTarget ?? 12;

  function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

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

    console.log("flushPendingResults called");
    console.log("resultsToSend:", resultsToSend);

    if (!resultsToSend.length) return;

    await flushBatch(resultsToSend);
    pendingResultsRef.current = [];
    setPendingResults([]);
  }

  function flushPendingResultsWithBeacon() {
    const resultsToSend = [...pendingResultsRef.current];
    if (!resultsToSend.length) return;

    try {
      const url = `/api/children/${childId}/decks/${deckId}/batch-progress`;
      const payload = JSON.stringify({ results: resultsToSend });
      const blob = new Blob([payload], { type: "application/json" });

      const sent = navigator.sendBeacon(url, blob);

      if (sent) {
        pendingResultsRef.current = [];
        setPendingResults([]);
      }
    } catch (err) {
      console.error("sendBeacon flush failed:", err);
    }
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

    console.log("maybeFlushLargeBatch called with:", resultsToSend);

    if (resultsToSend.length < BATCH_SIZE) return;

    await flushBatch(resultsToSend);
    pendingResultsRef.current = [];
    setPendingResults([]);
  }

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

    console.log("handleCardResult fired");
    console.log("new result:", result);

    const nextPending = [...pendingResultsRef.current, result];
    pendingResultsRef.current = nextPending;

    console.log("nextPending:", nextPending);

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
        // keep pending results if upload fails
      }
      return;
    }

    try {
      await maybeFlushLargeBatch();
    } catch (err) {
      // keep pending results if upload fails
    }
  }

  React.useEffect(() => {
    function handlePageHide() {
      flushPendingResultsWithBeacon();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        flushPendingResultsWithBeacon();
      }
    }

    function handleBeforeUnload() {
      flushPendingResultsWithBeacon();
    }

    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
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