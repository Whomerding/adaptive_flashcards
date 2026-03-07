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
  const [masteredIds, setMasteredIds] = React.useState(new Set());
  const [sessionFinished, setSessionFinished] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState("");
  const [cardStartedAt, setCardStartedAt] = React.useState(null);

  const BATCH_SIZE = 20;

  React.useEffect(() => {
    if (!session) return;

    setActiveCards(session.activeCards ?? []);
    setReserveCards(session.reserveCards ?? []);
    setCurrentCardIndex(0);
    setPendingResults([]);
    setMasteredIds(new Set());
    setSessionFinished(false);
    setSubmitError("");
    setCardStartedAt(Date.now());
  }, [session]);

  const currentCard = activeCards[currentCardIndex] ?? null;

  async function flushBatch(resultsToSend) {
    if (!resultsToSend.length) return;

    setIsSubmitting(true);
    setSubmitError("");

    try {
      await api.post(`/api/children/${childId}/decks/${deckId}/batch-progress`, {
        results: resultsToSend,
      });
    } catch (err) {
      console.error("Failed to upload batch results:", err);
      setSubmitError("Failed to save progress.");
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function flushPendingResults() {
    if (!pendingResults.length) return;

    const resultsToSend = [...pendingResults];
    await flushBatch(resultsToSend);
    setPendingResults([]);
  }

  function refillActiveCards(updatedActive, updatedReserve) {
    const nextActive = [...updatedActive];
    const nextReserve = [...updatedReserve];

    while (nextActive.length < 12 && nextReserve.length > 0) {
      nextActive.push(nextReserve.shift());
    }

    return {
      active: nextActive,
      reserve: nextReserve,
    };
  }

  async function maybeFlushLargeBatch(nextPendingResults) {
    if (nextPendingResults.length < BATCH_SIZE) return;

    await flushBatch(nextPendingResults);
    setPendingResults([]);
  }

async function handleCardResult({
  factId,
  correct,
  timedOut = false,
  mastered = false,
  typedAnswer = "",
}) {
  if (!currentCard) return;

  const now = new Date().toISOString();
  const responseMs = cardStartedAt ? Date.now() - cardStartedAt : null;

  const result = {
    factId,
    correct,
    timedOut,
    mastered,
    typedAnswer,
    seenAt: now,
    responseMs,
  };

  const nextPending = [...pendingResults, result];

  let nextActive = [...activeCards];
  let nextReserve = [...reserveCards];
  let nextIndex = currentCardIndex;

  const answeredCard = nextActive[currentCardIndex];

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
    nextActive.push(answeredCard);

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
      await flushBatch(nextPending);
      setPendingResults([]);
      setSessionFinished(true);
    } catch (err) {
      // keep pending results if upload fails
    }
    return;
  }

  try {
    await maybeFlushLargeBatch(nextPending);
  } catch (err) {
    // keep pending results if upload fails
  }
}

  React.useEffect(() => {
    async function handleBeforeUnload() {
      if (!pendingResults.length) return;
      try {
        await flushPendingResults();
      } catch (err) {
        // ignore here
      }
    }

    function onBeforeUnload() {
      // best-effort only; async is limited here by browser
      handleBeforeUnload();
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [pendingResults]);
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
  card={currentCard}
  isSubmitting={isSubmitting}
  canSaveProgress={pendingResults.length > 0}
  timeLimitSeconds={8}
  onSubmitAnswer={({ typedAnswer, correct }) =>
    handleCardResult({
      factId: currentCard.id,
      correct,
      mastered: false,
      typedAnswer,
    })
  }
  onTimedOut={() =>
    handleCardResult({
      factId: currentCard.id,
      correct: false,
      timedOut: true,
      mastered: false,
      typedAnswer: "",
    })
  }
  onSaveProgress={flushPendingResults}
/>
  </div>
);
}