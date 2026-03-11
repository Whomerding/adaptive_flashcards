import React from "react";
import Child from "../components/Child";
import AddChild from "../components/AddChild";
import api from "../api/axiosConfig";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [children, setChildren] = React.useState([]);
  const [deckId, setDeckId] = React.useState(null);
  const [deck, setDeck] = React.useState(null);
  const [isDeckLoading, setDeckLoading] = React.useState(false);
  
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

  async function handleAddChildren({name, avatar}) {
    setError(null);
    setLoading(true);
   
    try {
      const trimmedName = name.trim();
      if (!trimmedName) {
        setError("Child name cannot be empty");
  
        return;
      }
    const res = await api.post("/api/children", { name: trimmedName, avatar });
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
  try {
  const numericDeckId = Number(deckId);
  setError(null);
  setDeckLoading(true);
  navigate(`/children/${childId}/decks/${numericDeckId}`);
  } catch (err) {
    console.error("Failed to choose deck:", err);
    setError("Failed to load deck");
  } finally {
    setDeckLoading(false);
  }
}

 async function deleteChild(childId) {
    try {
      await api.delete(`/api/children/${childId}`);
      setChildren((prev) => prev.filter((child) => child.id !== childId));
    } catch (err) {
      console.error("Failed to delete child:", err);
      setError("Failed to delete child");
    }
  }


  return (
    loading ? (
      <div>Loading...</div>
    ) : (
    <div>
      
      <div className="container py-4">
        <div class="row row-cols-1 row-cols-sm-2 row-cols-md-3 g-5">
        {children.map((child) => (
          <Child key={child.id} id ={child.id} loading = {loading} child={child} chooseDeck={chooseDeck} deleteChild={deleteChild} />
        ))}
        </div>
      </div>
   
      <div className="container py-4">
        <div className="row g-4">
      <AddChild handleAddChildren={handleAddChildren} deleteChild={deleteChild} children={children} error={error} loading={loading} />
      </div>
    
      </div>
  </div>
  ))
}