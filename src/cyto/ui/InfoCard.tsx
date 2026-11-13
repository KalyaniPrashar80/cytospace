import { ChevronLeft, ChevronRight, Code2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HOTSPOTS, TOUR_ORDER, TOUR_STOP_SECONDS, nextHotspot } from "../content";
import { useCyto } from "../store";

export function InfoCard() {
  const focus = useCyto((s) => s.focus);
  const view = useCyto((s) => s.view);
  const touring = useCyto((s) => s.touring);
  const tourStep = useCyto((s) => s.tourStep);
  const setFocus = useCyto((s) => s.setFocus);
  const stopTour = useCyto((s) => s.stopTour);
  if (!focus || view !== "reality") return null;
  const h = HOTSPOTS[focus];
  const idx = TOUR_ORDER.indexOf(focus);
  const go = (dir: 1 | -1) => {
    stopTour();
    setFocus(nextHotspot(focus, dir));
  };

  return (
    <article
      key={focus}
      aria-live="polite"
      className="glass-strong pointer-events-auto relative max-h-[46vh] overflow-y-auto rounded-3xl p-4 animate-rise-in sm:p-5 md:fixed md:right-6 md:top-24 md:max-h-[calc(100vh-8rem)] md:w-[380px]"
      style={{ animationDelay: "0.5s" }}
    >
      {touring && (
        <div className="absolute inset-x-5 top-0 h-1 overflow-hidden rounded-full bg-primary/15">
          <div
            key={tourStep}
            className="h-full origin-left rounded-full bg-primary"
            style={{ animation: `tour-fill ${TOUR_STOP_SECONDS}s linear forwards` }}
          />
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="inline-block rounded-full bg-accent px-2.5 py-0.5 text-[0.68rem] font-medium uppercase tracking-wider text-accent-foreground">
            {h.tag}
          </span>
          <h2 className="mt-1.5 font-display text-3xl font-medium leading-none text-foreground sm:text-4xl">{h.title}</h2>
        </div>
        <Button
          variant="glass"
          size="icon-round"
          aria-label="Back to the cell"
          onClick={() => {
            stopTour();
            setFocus(null);
          }}
        >
          <X />
        </Button>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-foreground">{h.what}</p>

      <div className="mt-3 rounded-2xl bg-secondary p-3">
        <p className="flex items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground">
          <Code2 className="size-3.5" /> if you code
        </p>
        <p className="mt-1 text-sm leading-relaxed text-foreground">
          <span className="font-semibold">
            {h.analogy.term} = <span className="text-primary">{h.analogy.is}</span>.
          </span>{" "}
          {h.analogy.detail}
        </p>
      </div>

      <div className="mt-2.5 rounded-2xl bg-primary/10 p-3">
        <p className="flex items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-wider text-primary">
          <Sparkles className="size-3.5" /> fact
        </p>
        <p className="mt-1 text-sm leading-relaxed text-foreground">{h.fact}</p>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <Button variant="soft" size="sm" onClick={() => go(-1)} aria-label="Previous stop">
          <ChevronLeft /> prev
        </Button>
        <span className="text-xs text-muted-foreground">
          {touring ? "tour · " : ""}
          {idx + 1} / {TOUR_ORDER.length}
        </span>
        <Button variant="soft" size="sm" onClick={() => go(1)} aria-label="Next stop">
          next <ChevronRight />
        </Button>
      </div>
    </article>
  );
}
