import React from "react";
import "../styles/flashcard.css";

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
function parseMathPrompt(prompt = "") {
  const trimmed = String(prompt).trim();

  const match = trimmed.match(/^(-?\d+)\s*([+\-x×÷*/])\s*(-?\d+)$/);

  if (!match) {
    return null;
  }

  const [, left, operator, right] = match;

  const normalizedOperator =
    operator === "*" ? "×" : operator === "/" ? "÷" : operator;

  return {
    top: left,
    bottom: right,
    operator: normalizedOperator,
  };
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
  const [showBack, setShowBack] = React.useState(false);

  const inputRef = React.useRef(null);
  const tickTimeoutRef = React.useRef(null);
  const advanceTimeoutRef = React.useRef(null);

  const isLockedRef = React.useRef(false);
  const hasTimedOutRef = React.useRef(false);

  const clearTimers = React.useCallback(() => {
    if (tickTimeoutRef.current) {
      clearTimeout(tickTimeoutRef.current);
      tickTimeoutRef.current = null;
    }
    if (advanceTimeoutRef.current) {
      clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
  }, []);

  const finalizeCard = React.useCallback(
    ({ correct = false, timedOut = false, typedAnswer = "" }) => {
      if (!card) return;
      if (isLockedRef.current) return;

      isLockedRef.current = true;
      if (timedOut) {
        hasTimedOutRef.current = true;
      }

      clearTimers();
      setIsLocked(true);
      setShowBack(true);

      setFeedback({
        message: correct ? "Correct!" : `Oops! The answer was ${card.answer}`,
        color: correct ? "green" : "red",
      });

      advanceTimeoutRef.current = setTimeout(() => {
        if (timedOut) {
          onTimedOut();
        } else {
          onSubmitAnswer({
            typedAnswer,
            correct,
          });
        }
      }, 1000);
    },
    [card, clearTimers, onSubmitAnswer, onTimedOut]
  );

  React.useEffect(() => {
    setUserAnswer("");
    setFeedback(null);
    setIsLocked(false);
    setTimeLeft(timeLimitSeconds);
    setShowBack(false);

    isLockedRef.current = false;
    hasTimedOutRef.current = false;

    clearTimers();

    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    });

    return () => {
      clearTimers();
    };
  }, [card?.id, timeLimitSeconds, clearTimers]);

  React.useEffect(() => {
    if (!card) return;
    if (isSubmitting) return;
    if (isLockedRef.current) return;
    if (timeLeft <= 0) return;
    if (!inputRef.current) return;

    if (!isLocked && !isSubmitting) {
      inputRef.current.focus();
      inputRef.current.select?.();
      }

    tickTimeoutRef.current = setTimeout(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;

        if (next <= 0 && !hasTimedOutRef.current && !isLockedRef.current) {
          finalizeCard({ timedOut: true });
          return 0;
        }

        return next;
      });
    }, 1000);

    const parsedPrompt = parseMathPrompt(card?.prompt);
    return () => {
      if (tickTimeoutRef.current) {
        clearTimeout(tickTimeoutRef.current);
        tickTimeoutRef.current = null;
      }
    };
  }, [card, isSubmitting, timeLeft, isLocked, finalizeCard]);

  function handleSubmit(e) {
    e.preventDefault();

    if (!card) return;
    if (isSubmitting || isLockedRef.current) return;

    const typed = userAnswer.trim();
    if (!typed) return;

    const correct = answersMatch(typed, card.answer);

    finalizeCard({
      typedAnswer: typed,
      correct,
      timedOut: false,
    });
  }

  const feedbackClass =
    feedback?.color === "green"
      ? "flashcard--correct"
      : feedback?.color === "red"
      ? "flashcard--incorrect"
      : "";

const parsedPrompt = parseMathPrompt(card?.prompt);

  return (
    <div className="flashcard-wrapper flashcard-page">
      <div className="flashcard-shell-wrap">
  <div className={`flashcard-shell ${feedbackClass}`}>
        <div className="flashcard-timer-wrap">
          <div className={`flashcard-timer ${timeLeft <= 3 ? "flashcard-timer--urgent" : ""}`}>
            ⏱ {Math.max(0, timeLeft)}
          </div>
        </div>

        <div className={`flashcard-flip ${showBack ? "is-flipped" : ""}`}>
          <div className="flashcard-face flashcard-front">
  {parsedPrompt ? (
  <div className="math-problem" aria-label={card?.prompt}>
    <div className="math-row math-top-row">
      <span className="math-number">{parsedPrompt.top}</span>
    </div>

    <div className="math-row math-bottom-row">
      <span className="math-operator">{parsedPrompt.operator}</span>
      <span className="math-number">{parsedPrompt.bottom}</span>
    </div>

    <div className="math-line" />
  </div>
) : (
  <h2 className="flashcard-prompt">{card?.prompt}</h2>
)}

            <form onSubmit={handleSubmit} className="flashcard-form">
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                disabled={isSubmitting || isLocked}
                placeholder="Type your answer"
                className="flashcard-input"
              />

              <button
                type="submit"
                disabled={isSubmitting || isLocked}
                className="flashcard-submit"
              >
                Submit
              </button>
            </form>
          </div>

          <div className="flashcard-face flashcard-back">
            {feedback && (
              <>
                <div
                  className={`flashcard-feedback ${
                    feedback.color === "green"
                      ? "flashcard-feedback--correct"
                      : "flashcard-feedback--incorrect"
                  }`}
                >
                  {feedback.message}
                </div>

                <div className="flashcard-answer-label">Answer</div>
                <div className="flashcard-answer-value">{card?.answer}</div>
              </>
            )}
          </div>
        </div>
      </div>
</div>
      <div className="flashcard-actions">
        <button
          onClick={onSaveProgress}
          disabled={!canSaveProgress || isSubmitting}
          className="flashcard-save"
        >
          Save Progress Now
        </button>
      </div>
    </div>
  );
}