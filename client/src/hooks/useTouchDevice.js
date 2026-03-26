import React from "react";

export function useTouchDevice() {
  const [isTouchDevice, setIsTouchDevice] = React.useState(false);

  React.useEffect(() => {
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const touchPoints = navigator.maxTouchPoints > 0;
    const touchEvent = "ontouchstart" in window;

    setIsTouchDevice(coarsePointer || touchPoints || touchEvent);
  }, []);

  return isTouchDevice;
}