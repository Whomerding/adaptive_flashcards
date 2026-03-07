import React from "react";

function answersMatch(typed, expected) {
  const typedNum = Number(String(typed).trim());
  const expectedNum = Number(String(expected).trim());

  if (!Number.isNaN(typedNum) && !Number.isNaN(expectedNum)) {
    return typedNum === expectedNum;
  }

  return (
    String(typed).trim().toLowerCase() ===
    String(expected).trim().toLowerCase()
  );
}

export default function Flashcard({
  card,
  isSubmitting,
  onSubmitAnswer,
  onTimedOut,
  onSaveProgress,
  canSaveProgress,
  timeLimitSeconds = 8,
}) {
  const [userAnswer, setUserAnswer] = React.useState("");
  const [feedback, setFeedback] = React.useState(null);
  const [isLocked, setIsLocked] = React.useState(false);
  const [timeLeft, setTimeLeft] = React.useState(timeLimitSeconds);

  const intervalRef = React.useRef(null);
  const advanceTimeoutRef = React.useRef(null);
  const hasTimedOutRef = React.useRef(false);

  React.useEffect(() => {
    setUserAnswer("");
    setFeedback(null);
    setIsLocked(false);
    setTimeLeft(timeLimitSeconds);
    hasTimedOutRef.current = false;

    if (intervalRef.current) clearInterval(intervalRef.current);
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    };
  }, [card?.id, timeLimitSeconds]);

  React.useEffect(() => {
    if (!card || isLocked || isSubmitting) return;

    if (timeLeft > 0) return;

    if (hasTimedOutRef.current) return;
    hasTimedOutRef.current = true;

    if (intervalRef.current) clearInterval(intervalRef.current);

    setIsLocked(true);
    setFeedback({
      message: `Oops! The answer was ${card.answer}`,
      color: "red",
    });

    advanceTimeoutRef.current = setTimeout(() => {
      onTimedOut();
    }, 1000);
  }, [timeLeft, card, isLocked, isSubmitting, onTimedOut]);

  function handleSubmit(e) {
    e.preventDefault();

    if (isLocked || isSubmitting) return;

    const typed = userAnswer.trim();
    if (!typed) return;

    if (intervalRef.current) clearInterval(intervalRef.current);

    const correct = answersMatch(typed, card.answer);

    setIsLocked(true);
    setFeedback({
      message: correct ? "Correct!" : `Oops! The answer was ${card.answer}`,
      color: correct ? "green" : "red",
    });

    advanceTimeoutRef.current = setTimeout(() => {
      onSubmitAnswer({
        typedAnswer: typed,
        correct,
      });
    }, 1000);
  }

  const cardBackground =
    feedback?.color === "green"
      ? "#eaf8ea"
      : feedback?.color === "red"
      ? "#fdecec"
      : "#fff";

  return (
    <div>
      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: "12px",
          padding: "1rem",
          marginTop: "1rem",
          textAlign: "center",
          background: cardBackground,
          transition: "background 0.2s ease",
        }}
      >
        <div
          style={{
            fontSize: "1.1rem",
            fontWeight: "bold",
            marginBottom: "0.75rem",
          }}
        >
          ⏱ {Math.max(0, timeLeft)}
        </div>

        <h2>{card.prompt}</h2>

        <form onSubmit={handleSubmit} style={{ marginTop: "1rem" }}>
          <input
            type="text"
            inputMode="numeric"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            disabled={isSubmitting || isLocked}
            placeholder="Type your answer"
            autoFocus
            style={{
              fontSize: "1.5rem",
              padding: "0.5rem",
              width: "120px",
              textAlign: "center",
            }}
          />

          <button
            type="submit"
            disabled={isSubmitting || isLocked}
            style={{ marginLeft: "0.5rem" }}
          >
            Submit
          </button>
        </form>

        {feedback && (
          <div
            style={{
              marginTop: "1rem",
              fontSize: "1.4rem",
              fontWeight: "bold",
              color: feedback.color,
            }}
          >
            {feedback.message}
          </div>
        )}
      </div>

      <div style={{ marginTop: "1rem" }}>
        <button
          onClick={onSaveProgress}
          disabled={!canSaveProgress || isSubmitting}
        >
          Save Progress Now
        </button>
      </div>
    </div>
  );
}