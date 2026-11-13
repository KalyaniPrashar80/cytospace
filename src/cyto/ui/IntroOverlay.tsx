import { useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { live, skipIntro, useCyto } from "../store";

const CAPTIONS: { a: number; b: number; text: string; sub?: string }[] = [
  { a: 0.14, b: 0.36, text: "That dot? It's a cell.", sub: "Keep scrolling. We're going in." },
  { a: 0.38, b: 0.6, text: "Not a circle.", sub: "A crowded, moving, humming world." },
  { a: 0.64, b: 0.84, text: "Through the membrane…" },
  { a: 0.86, b: 1.01, text: "Welcome inside." },
];

const sm = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function IntroOverlay() {
  const phase = useCyto((s) => s.phase);
  const hero = useRef<HTMLDivElement>(null);
  const caps = useRef<(HTMLDivElement | null)[]>([]);
  const cue = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const p = live.smooth;
      if (hero.current) {
        const o = 1 - sm(0.01, 0.1, p);
        hero.current.style.opacity = String(o);
        hero.current.style.transform = `translateY(${-p * 300}px)`;
      }
      CAPTIONS.forEach((c, i) => {
        const el = caps.current[i];
        if (!el) return;
        const o = sm(c.a, c.a + 0.05, p) * (1 - sm(c.b - 0.05, c.b, p));
        el.style.opacity = String(o);
        el.style.transform = `translateY(${(1 - o) * 16}px)`;
      });
      if (cue.current) cue.current.style.opacity = String(1 - sm(0.8, 0.95, p));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (phase === "explore") return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-20">
      <div ref={hero} className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <div className="-mt-[34vh] flex flex-col items-center sm:-mt-[30vh]">
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.35em] text-muted-foreground sm:text-xs">
            a field trip for your biology brain
          </p>
          <h1 className="mt-3 font-display text-[3.6rem] font-medium leading-[0.9] tracking-tight text-foreground sm:text-8xl">
            The <em className="text-primary">cell</em>,
            <br />
            for real.
          </h1>
        </div>
        <p className="mt-[24vh] max-w-xs text-balance-nice text-sm leading-relaxed text-muted-foreground sm:mt-[22vh] sm:max-w-sm sm:text-base">
          You've only ever met it as a labelled circle. Scroll, and meet the real one.
        </p>
      </div>

      {CAPTIONS.map((c, i) => (
        <div
          key={i}
          ref={(el) => {
            caps.current[i] = el;
          }}
          className="absolute inset-x-0 top-[20vh] px-6 text-center opacity-0"
        >
          <p className="font-display text-4xl font-medium italic text-foreground sm:text-6xl">{c.text}</p>
          {c.sub && <p className="mt-3 text-sm text-muted-foreground sm:text-base">{c.sub}</p>}
        </div>
      ))}

      <div ref={cue} className="absolute inset-x-0 bottom-6 flex flex-col items-center gap-3">
        <div className="flex flex-col items-center text-muted-foreground animate-float-soft">
          <span className="text-[0.7rem] uppercase tracking-[0.3em]">scroll</span>
          <ChevronDown className="size-4" />
        </div>
        <button
          onClick={skipIntro}
          className="pointer-events-auto cursor-pointer text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
        >
          skip the intro
        </button>
      </div>
    </div>
  );
}
