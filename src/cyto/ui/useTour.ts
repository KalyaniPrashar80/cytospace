import { useEffect } from "react";
import { TOUR_ORDER, TOUR_STOP_SECONDS } from "../content";
import { useCyto } from "../store";

/** Plays every hotspot in order, then returns to the cell overview. */
export function useTour() {
  const touring = useCyto((s) => s.touring);
  const phase = useCyto((s) => s.phase);
  useEffect(() => {
    if (!touring || phase !== "explore") return;
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      const st = useCyto.getState();
      if (!st.touring) return;
      if (i >= TOUR_ORDER.length) {
        st.setFocus(null);
        st.stopTour();
        return;
      }
      st.setTourStep(i);
      st.setFocus(TOUR_ORDER[i]!);
      i++;
      timer = setTimeout(step, TOUR_STOP_SECONDS * 1000);
    };
    timer = setTimeout(step, 500);
    return () => clearTimeout(timer);
  }, [touring, phase]);
}
