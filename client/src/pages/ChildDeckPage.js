import React from "react";
import api from "../api/axiosConfig";
import StudySession from "../components/StudySession";
import { useParams } from "react-router-dom";

export default function ChildDeckPage() {
  const { childId, deckId } = useParams();

  const [session, setSession] = React.useState({
    deck: null,
    cards: [],
    sessionConfig: null,
  });

  const [isDeckLoading, setDeckLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let isMounted = true;

    async function getChildDeckSession(deckId, childId) {
      setDeckLoading(true);
      setError("");

      try {
        let res = await api.get(`/api/children/${childId}/decks/${deckId}/session`);
      

        if (res.data.deck === null) {
          await api.post(`/api/children/${childId}/decks/${deckId}/ensure`);
          res = await api.get(`/api/children/${childId}/decks/${deckId}/session`);
       
        }

        if (!isMounted) return;

        setSession({
          deck: res.data.deck ?? null,
          cards: res.data.cards ?? [],
          sessionConfig: res.data.sessionConfig ?? null,
        });
      } catch (err) {
        console.error("Failed to fetch deck session:", err);

        if (!isMounted) return;
        setError("Failed to load deck");
      } finally {
        if (isMounted) setDeckLoading(false);
      }
    }

    getChildDeckSession(deckId, childId);

    return () => {
      isMounted = false;
    };
  }, [deckId, childId]);



  return (
    <div>
      <StudySession
        session={session}
        childId={childId}
        deckId={deckId}
        isLoading={isDeckLoading}
        error={error}
      />
    </div>
  );
}