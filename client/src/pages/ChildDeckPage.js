import React from "react";
import api from "../api/axiosConfig";
import StudySession from "../components/StudySession";
import { useParams } from "react-router-dom";
import { getAdditionRewardState } from "../data/rewardHelpers";
import "../styles/ChildDeckPage.css"
export default function ChildDeckPage() {
  const { childId, deckId } = useParams();

  const [session, setSession] = React.useState({
    deck: null,
    cards: [],
    sessionConfig: null,
    rewardProgress: null,
  });

  const [isDeckLoading, setDeckLoading] = React.useState(true);
  const [error, setError] = React.useState("");
const [earnedReward, setEarnedReward] = React.useState(null);

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
          rewardProgress: res.data.rewardProgress ?? null,
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

function handleRewardEarned(reward) {
  setSession((prev) => {
    const nextTotalRewards = reward.totalRewards;
    const rewardStep = Math.floor(nextTotalRewards / 5);

    return {
      ...prev,
      rewardProgress: {
        ...prev.rewardProgress,
        totalRewards: nextTotalRewards,
        stage: rewardStep,
        nextUnlockAt: (rewardStep + 1) * 5,
      },
    };
  });

  const rewardStep = Math.floor(reward.totalRewards / 5);
  const previousStep = Math.floor((reward.totalRewards - 1) / 5);

  if (rewardStep > previousStep) {
    const rewardState = getAdditionRewardState(rewardStep);
    setEarnedReward(rewardState);

    setTimeout(() => {
      setEarnedReward(null);
    }, 2000);
  }
}

const totalRewards = session.rewardProgress?.totalRewards ?? 0;
const rewardStep = Math.floor(totalRewards / 5);
const rewardState = getAdditionRewardState(rewardStep);

console.log("RENDER reward state", {
  totalRewards: session.rewardProgress?.totalRewards,
  rewardStep,
  rewardState,
});
return (
  <div className="child-deck-page">
    {rewardState?.imagePath && (
      <div className="reward-progress">
        <div className="reward-progress-frame">
          <img src={rewardState.imagePath} alt="Reward progress" />
        </div>
      </div>
    )}

    <StudySession
      session={session}
      childId={childId}
      deckId={deckId}
      isLoading={isDeckLoading}
      error={error}
      onRewardEarned={handleRewardEarned}
    />

    {earnedReward?.imagePath && (
      <div className="reward-overlay">
        <div className="reward-popup">
          <div className="reward-title">✨ New Reward Unlocked! ✨</div>
          <img src={earnedReward.imagePath} alt="Reward unlocked" />
        </div>
      </div>
    )}
  </div>
);
}