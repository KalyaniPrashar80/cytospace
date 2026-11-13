import { HOTSPOTS, TOUR_ORDER } from "../content";
import { LENS_TAGS } from "../labels";
import { live, useCyto } from "../store";
import { cn } from "@/lib/utils";

const pin = (id: string) => (el: HTMLElement | null) => {
  live.labelEls[id] = el;
};

export function HotspotMarkers() {
  const show = useCyto((s) => s.phase === "explore" && s.view === "reality" && s.focus === null);
  const setFocus = useCyto((s) => s.setFocus);
  const stopTour = useCyto((s) => s.stopTour);
  return (
    <>
      {TOUR_ORDER.map((id) => (
        <div key={id} ref={pin(`spot:${id}`)} className="invisible absolute left-0 top-0 will-change-transform">
          <button
            type="button"
            aria-label={`Zoom into ${HOTSPOTS[id].title}`}
            tabIndex={show ? 0 : -1}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => {
              stopTour();
              setFocus(id);
            }}
            className={cn(
              "group flex cursor-pointer items-center gap-2 whitespace-nowrap transition-opacity",
              show ? "pointer-events-auto opacity-100 duration-700" : "pointer-events-none opacity-0 duration-200",
            )}
          >
            <span className="relative grid size-8 place-items-center">
              <span className="absolute inset-0 rounded-full bg-primary/40 animate-hotspot-ping" />
              <span className="size-3.5 rounded-full bg-primary shadow-glow ring-4 ring-card/80 transition-transform group-hover:scale-125" />
            </span>
            <span className="glass rounded-full px-3 py-1 text-xs font-medium text-foreground">{HOTSPOTS[id].title}</span>
          </button>
        </div>
      ))}
    </>
  );
}

export function LensTags() {
  return (
    <>
      {LENS_TAGS.map((t) => (
        <span
          key={t.id}
          ref={pin(t.id)}
          className="glass invisible absolute left-0 top-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-medium text-foreground"
        >
          {t.text}
        </span>
      ))}
    </>
  );
}
