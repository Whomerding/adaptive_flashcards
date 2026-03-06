import React from "react";
import api from "../api/axiosConfig";
import StudySession from "../components/StudySession";
import { useParams } from "react-router-dom";


export default function ChildDeckPage() {
const [error, setError] = React.useState(null);
const [deck, setDeck] = React.useState(null);
const [isDeckLoading, setDeckLoading] = React.useState(false);
const {childId, deckId} = useParams();

React.useEffect(() => {
async function getChildDeck(deckId, childId) {
  try {
    let res = await api.get(`/api/children/${childId}/decks/${deckId}`);


    if (res.data.deck === null) {
      await api.post(`/api/children/${childId}/decks/${deckId}/ensure`);
      res = await api.get(`/api/children/${childId}/decks/${deckId}`);
 
    }

    setDeck(res.data.facts ?? []);
  } catch (err) {
    console.error("Failed to fetch deck:", err);
    setError("Failed to load deck");
  } finally {
    setDeckLoading(false);
  }
}

getChildDeck(deckId, childId);

}, [deckId, childId]);

console.log("deck state:", deck, isDeckLoading, error);
  return (
    <div>
      <h1>Child Deck Page</h1>
    <StudySession deck={deck} isLoading={isDeckLoading} error={error} />
    </div>
  );
}   