import { cn } from "@/lib/utils";
import { skipIntro, useCyto, type View } from "../store";

const OPTIONS: { id: View; label: string }[] = [
  { id: "textbook", label: "textbook" },
  { id: "reality", label: "reality" },
];

export function Header() {
  const view = useCyto((s) => s.view);
  const phase = useCyto((s) => s.phase);
  const setView = useCyto((s) => s.setView);
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-5">
      <div className="pointer-events-auto flex items-center gap-2">
        <span className="size-2.5 rounded-full bg-primary shadow-glow" />
        <span className="font-display text-xl font-semibold tracking-[0.18em] text-foreground sm:text-2xl">
          CYTO SPACE
        </span>
      </div>
      <div role="radiogroup" aria-label="How to see the cell" className="glass pointer-events-auto relative flex rounded-full p-1">
        <span
          aria-hidden
          className={cn(
            "absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-primary shadow-glow transition-transform duration-500 ease-[cubic-bezier(0.5,1.6,0.4,1)]",
            view === "reality" ? "translate-x-full" : "translate-x-0",
          )}
        />
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            role="radio"
            aria-checked={view === o.id}
            onClick={() => {
              setView(o.id);
              if (phase === "intro") skipIntro();
            }}
            className={cn(
              "relative z-10 w-[5.6rem] cursor-pointer rounded-full py-1.5 text-xs font-medium transition-colors duration-300 sm:w-28 sm:text-sm",
              view === o.id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </header>
  );
}
