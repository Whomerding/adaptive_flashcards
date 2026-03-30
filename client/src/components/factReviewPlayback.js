import React from "react";
import "../styles/factReviewPlayback.css";

function parseMathPrompt(prompt = "") {
  const trimmed = String(prompt).trim();
  const match = trimmed.match(/^(-?\d+)\s*([+\-x×÷*/])\s*(-?\d+)$/);

  if (!match) return null;

  const [, left, operator, right] = match;

  const normalizedOperator =
    operator === "*" ? "×" : operator === "/" ? "÷" : operator;

  return {
    left,
    operator: normalizedOperator,
    right,
  };
}

function operatorToWord(operator) {
  switch (operator) {
    case "+":
      return "plus";
    case "-":
      return "minus";
    case "×":
    case "x":
      return "times";
    case "÷":
      return "divided by";
    default:
      return operator;
  }
}

function speakText(text) {
  if (!("speechSynthesis" in window)) return null;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.85;
  utterance.pitch = 1;
  utterance.volume = 1;

  const voices = window.speechSynthesis.getVoices();
  const preferredVoice =
    voices.find((voice) => voice.name.toLowerCase().includes("samantha")) ||
    voices.find((voice) => voice.lang?.startsWith("en-US")) ||
    voices[0];

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  window.speechSynthesis.speak(utterance);
  return utterance;
}

export default function FactReviewPlayback({
  card,
  repeatCount = 3,
  stepDuration = 900,
  cyclePause = 700,
  autoPlay = true,
  onComplete,
}) {
  const parsedPrompt = React.useMemo(() => parseMathPrompt(card?.prompt), [card]);

  const [activeStep, setActiveStep] = React.useState(null);
  const [currentRepeat, setCurrentRepeat] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(autoPlay);

  const timeoutRef = React.useRef(null);
  const unmountedRef = React.useRef(false);

  const clearPlaybackTimeout = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const cancelSpeech = React.useCallback(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const fallbackSequence = React.useMemo(() => {
    if (!card) return [];
    return [
      { key: "prompt", text: String(card.prompt ?? "") },
      { key: "equals", text: "equals" },
      { key: "answer", text: String(card.answer ?? "") },
    ];
  }, [card]);

  const sequence = React.useMemo(() => {
    if (!parsedPrompt || !card) return fallbackSequence;

    return [
      { key: "left", text: parsedPrompt.left },
      { key: "operator", text: operatorToWord(parsedPrompt.operator) },
      { key: "right", text: parsedPrompt.right },
      { key: "equals", text: "equals" },
      { key: "answer", text: String(card.answer) },
    ];
  }, [parsedPrompt, card, fallbackSequence]);

  React.useEffect(() => {
    return () => {
      unmountedRef.current = true;
      clearPlaybackTimeout();
      cancelSpeech();
    };
  }, [clearPlaybackTimeout, cancelSpeech]);

  React.useEffect(() => {
    setActiveStep(null);
    setCurrentRepeat(0);
    setIsPlaying(autoPlay);
    clearPlaybackTimeout();
    cancelSpeech();
  }, [card, autoPlay, clearPlaybackTimeout, cancelSpeech]);

  React.useEffect(() => {
    if (!card || !isPlaying || !sequence.length) return;

    let stepIndex = 0;
    let repeatIndex = 0;

    function runStep() {
      if (unmountedRef.current) return;

      const step = sequence[stepIndex];
      setActiveStep(step.key);
      speakText(step.text);

      timeoutRef.current = setTimeout(() => {
        if (unmountedRef.current) return;

        const atLastStep = stepIndex === sequence.length - 1;

        if (atLastStep) {
          const nextRepeat = repeatIndex + 1;
          setCurrentRepeat(nextRepeat);

          if (nextRepeat >= repeatCount) {
            setActiveStep(step.key);

            timeoutRef.current = setTimeout(() => {
              if (unmountedRef.current) return;
              setIsPlaying(false);
              onComplete?.();
            }, cyclePause);

            return;
          }

          stepIndex = 0;
          repeatIndex = nextRepeat;

          timeoutRef.current = setTimeout(() => {
            if (unmountedRef.current) return;
            runStep();
          }, cyclePause);

          return;
        }

        stepIndex += 1;
        runStep();
      }, stepDuration);
    }

    timeoutRef.current = setTimeout(() => {


      timeoutRef.current = setTimeout(() => {
        if (unmountedRef.current) return;
        runStep();
      }, 900);
    }, 250);

    return () => {
      clearPlaybackTimeout();
      cancelSpeech();
    };
  }, [
    card,
    isPlaying,
    sequence,
    repeatCount,
    stepDuration,
    cyclePause,

    onComplete,
    clearPlaybackTimeout,
    cancelSpeech,
  ]);

  if (!card) return null;

  const isLeftActive = activeStep === "left";
  const isOperatorActive = activeStep === "operator";
  const isRightActive = activeStep === "right";
  const isEqualsActive = activeStep === "equals";
  const isAnswerActive = activeStep === "answer";
  const isPromptActive = activeStep === "prompt";

  if (!parsedPrompt) {
    return (
      <div className="fact-review-page">
        <div className="fact-review-shell">
          <div className="fact-review-header">
            <div className="fact-review-title">Review</div>
    
            <div className="fact-review-progress">
              Repeat {Math.min(currentRepeat + 1, repeatCount)} of {repeatCount}
            </div>
          </div>

          <div className="fact-review-fallback">
            <div
              className={`fact-review-fallback-prompt ${
                isPromptActive ? "fact-review-token--active" : ""
              }`}
            >
              {card.prompt}
            </div>

            <div
              className={`fact-review-fallback-answer ${
                isAnswerActive ? "fact-review-token--active" : ""
              }`}
            >
              = {card.answer}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fact-review-page">
      <div className="fact-review-shell">
        <div className="fact-review-header">
          <div className="fact-review-title">Review</div>
  
          <div className="fact-review-progress">
            Repeat {Math.min(currentRepeat + 1, repeatCount)} of {repeatCount}
          </div>
        </div>

        <div
          className="fact-review-board"
          aria-label={`${card.prompt} equals ${card.answer}`}
        >
          <div className="fact-review-row fact-review-top-row">
            <span
              className={`fact-review-token fact-review-number ${
                isLeftActive ? "fact-review-token--active" : ""
              }`}
            >
              {parsedPrompt.left}
            </span>
          </div>

          <div className="fact-review-row fact-review-bottom-row">
            <span
              className={`fact-review-token fact-review-operator ${
                isOperatorActive ? "fact-review-token--active" : ""
              }`}
            >
              {parsedPrompt.operator}
            </span>

            <span
              className={`fact-review-token fact-review-number ${
                isRightActive ? "fact-review-token--active" : ""
              }`}
            >
              {parsedPrompt.right}
            </span>
          </div>

          <div
            className={`fact-review-line ${
              isEqualsActive ? "fact-review-line--active" : ""
            }`}
          />

          <div className="fact-review-answer-row">
            <span
              className={`fact-review-token fact-review-answer ${
                isAnswerActive ? "fact-review-token--active" : ""
              }`}
            >
              {card.answer}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}