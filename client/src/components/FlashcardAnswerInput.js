import React from "react";

export default function FlashcardAnswerInput({
  value,
  onChange,
  onSubmit,
  disabled,
  focusKey,
}) {
  const inputRef = React.useRef(null);
React.useEffect(() => {
  console.log("input mounted");
  return () => console.log("input unmounted");
}, []);

  React.useEffect(() => {
    if (disabled) return;
    if (!inputRef.current) return;

    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select?.();
    });
  }, [focusKey, disabled]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flashcard-form"
    >
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Answer"
        className="flashcard-input"
      />

      <button
        type="submit"
        disabled={disabled}
        className="flashcard-submit"
      >
        Submit
      </button>
    </form>
  );
}