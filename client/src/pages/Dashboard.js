import React from "react";
import Child from "../components/Child";
import AddChild from "../components/AddChild";
import api from "../api/axiosConfig";
import axios from "axios";

export default function Dashboard() {
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [children, setChildren] = React.useState([]);
  const [deckId, setDeckId] = React.useState(null);
  const [deck, setDeck] = React.useState(null);
  
    async function fetchChildren() {
        try {
            const res = await api.get("/api/children", { withCredentials: true });
             setChildren(res.data.children ?? []);
    } catch (e) {
      console.error("Failed to fetch children:", e);
      setError("Failed to load children.");
    }
  }
    React.useEffect(() => {
        fetchChildren();
    }, []); 

  async function handleAddChildren(e) {
    setError(null);
    setLoading(true);
   
    try {
      const trimmedName = e.trim();
      if (!trimmedName) {
        setError("Child name cannot be empty");
  
        return;
      }
    const res = await api.post("/api/children", { name: trimmedName });
         const newChild = res.data.child ?? res.data; 
    setChildren((prev) => [...prev, newChild]);
    } catch (err) {
      console.error(err);
      setError("Failed to add child");
    } finally {
      setLoading(false);
    }
  }

  async function chooseDeck(deckId, childId) {
    console.log("Deck ID:", deckId, "Child ID:", childId);
    setDeckId(deckId);
    const res = await api.get (`/api/children/${childId}/decks/${deckId}/`);
    const deck = res.data;
    console.log("Deck data:", deck);
    if (deck.deck === null) {
      console.log("Deck is null, cannot start game");

    } else {
     setDeck(deck.facts);
    }
  }
 

  return (
    <div>
      <h1>Dashboard</h1>
      <ul>
        {children.map((child) => (
          <Child key={child.id} id ={child.id} name={child.name} chooseDeck={chooseDeck} />
        ))}
      </ul>
      <AddChild handleAddChildren={handleAddChildren} error={error} />
    </div>
  );
}