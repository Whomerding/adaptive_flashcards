import React from "react";
import Flashcard from "./Flashcard";

export default function StudySession({ deck, isLoading, error }) {
    console.log("StudySession props:", { deck, isLoading, error });
  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h1>Flashcard Deck</h1>
        {deck.length === 0 ? (
          <div>No flashcards available.</div>
        ) : (
          deck.map((fact) => <Flashcard key={fact.id} deck={fact} />)
        )}
    </div>
  );
}