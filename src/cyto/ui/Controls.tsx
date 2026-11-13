import { Play, Rabbit, RotateCcw, Snail, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { SPEED_MAX, SPEED_MIN } from "../content";
import { replayIntro, skipIntro, useCyto } from "../store";

export function Controls() {
  const speed = useCyto((s) => s.speed);
  const setSpeed = useCyto((s) => s.setSpeed);
  const touring = useCyto((s) => s.touring);
  const phase = useCyto((s) => s.phase);
  const startTour = useCyto((s) => s.startTour);
  const stopTour = useCyto((s) => s.stopTour);
  const setFocus = useCyto((s) => s.setFocus);

  return (
    <div className="glass pointer-events-auto mx-auto w-full max-w-2xl rounded-3xl px-4 pb-2.5 pt-3 animate-rise-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
        <div className="flex flex-1 items-center gap-3">
          <span className="shrink-0 text-[0.68rem] font-semibold uppercase leading-tight tracking-wider text-muted-foreground">
            speed
            <br />
            of life
          </span>
          <Snail className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <Slider
            aria-label="Speed of life"
            min={SPEED_MIN}
            max={SPEED_MAX}
            step={0.05}
            value={[speed]}
            onValueChange={(v) => setSpeed(v[0] ?? 1)}
          />
          <Rabbit className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
            {speed.toFixed(1)}×
          </span>
        </div>
        <Button
          variant="hero"
          size="pill"
          className="w-full sm:w-auto"
          onClick={() => {
            if (touring) {
              stopTour();
              setFocus(null);
            } else {
              if (phase === "intro") skipIntro();
              startTour();
            }
          }}
        >
          {touring ? <Square /> : <Play />}
          {touring ? "stop the tour" : "take the tour"}
        </Button>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-[0.68rem] text-muted-foreground">
        <span>Stylized for learning. Not to scale.</span>
        <button onClick={replayIntro} className="flex cursor-pointer items-center gap-1 hover:text-primary">
          <RotateCcw className="size-3" /> replay intro
        </button>
      </div>
    </div>
  );
}
