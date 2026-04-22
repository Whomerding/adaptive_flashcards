import { rewardAssets } from "./rewardAssets";

export function getAdditionRewardState(rewardStep) {
  const dragons = rewardAssets.addition;
  if (!dragons?.length) return null;

  let remaining = Math.max(0, rewardStep);

  for (let dragonIndex = 0; dragonIndex < dragons.length; dragonIndex += 1) {
    const stages = dragons[dragonIndex];

    if (remaining < stages.length) {
      return {
        dragonIndex,
        stageIndex: remaining,
        imagePath: stages[remaining],
      };
    }

    remaining -= stages.length;
  }

  const lastDragonIndex = dragons.length - 1;
  const lastStageIndex = dragons[lastDragonIndex].length - 1;

  return {
    dragonIndex: lastDragonIndex,
    stageIndex: lastStageIndex,
    imagePath: dragons[lastDragonIndex][lastStageIndex],
  };
}