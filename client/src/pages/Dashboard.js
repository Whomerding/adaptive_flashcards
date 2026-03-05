import React from "react";
import Child from "../components/Child";
import AddChild from "../components/AddChild";
import api from "../api/axiosConfig";
import axios from "axios";

export default function Dashboard() {
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [children, setChildren] = React.useState([]);
  const [name, setName] = React.useState("");

  
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

  async function handleSubmit(e) {
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
    setName("");
    } catch (err) {
      console.error(err);
      setError("Failed to add child");
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <div>
      <h1>Dashboard</h1>
      <ul>
        {children.map((child) => (
          <Child key={child.id} name={child.name} />
        ))}
      </ul>
      <AddChild handleSubmit={handleSubmit} error={error} />
    </div>
  );
}