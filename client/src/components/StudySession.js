import React from "react";
import Flashcard from "./Flashcard";
import api from "../../../client/src/api/axiosConfig.js";

export default function StudySession({ session, isLoading, error }) {
   const { deck, activeCards, reserveCards, sessionConfig } = session; 


if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;
  if (!deck) return <div>No deck found.</div>;

  return (
    <div>
      <h2>{deck.deck_name}</h2>
      <p>Active cards: {activeCards.length}</p>
      <p>Reserve cards: {reserveCards.length}</p>
    </div>
  );
}