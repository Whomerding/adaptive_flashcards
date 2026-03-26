import React from "react";
import "../styles/flashcard-keypad-input.css";

export default function FlashcardKeypadInput({
  value,
  onChange,
  onSubmit,
  disabled,
}) {
  function append(char) {
    if (disabled) return;
    onChange(value + char);
  }

  function backspace() {
    if (disabled) return;
    onChange(value.slice(0, -1));
  }



  return (
    <div className="flashcard-keypad-wrap">
      <div className="flashcard-answer-display">
        {value || "Answer"}
      </div>

      <div className="flashcard-keypad">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => append(num)}
            disabled={disabled}
            className="keypad-btn"
          >
            {num}
          </button>
        ))}

        <button
          type="button"
          onClick={backspace}
          disabled={disabled}
          className="keypad-btn"
        >
          ⌫
        </button>


        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
          className="keypad-btn keypad-submit"
        >
          Submit
        </button>
      </div>
    </div>
  );
}