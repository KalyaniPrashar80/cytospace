import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCyto } from "../store";

type Label = { text: string; x: number; y: number; to: [number, number]; side: "l" | "r" };
const LABELS: Label[] = [
  { text: "Golgi apparatus", x: 6, y: 96, to: [142, 140], side: "l" },
  { text: "cytoplasm", x: 6, y: 222, to: [112, 228], side: "l" },
  { text: "mitochondrion", x: 6, y: 336, to: [140, 304], side: "l" },
  { text: "nucleus", x: 414, y: 112, to: [236, 168], side: "r" },
  { text: "nucleolus", x: 414, y: 160, to: [228, 204], side: "r" },
  { text: "rough ER", x: 414, y: 252, to: [286, 228], side: "r" },
  { text: "ribosomes", x: 414, y: 296, to: [300, 268], side: "r" },
  { text: "cell membrane", x: 414, y: 388, to: [300, 316], side: "r" },
];

function d(i: number) {
  return { animationDelay: `${0.15 + i * 0.12}s` };
}

export function Textbook() {
  const view = useCyto((s) => s.view);
  const setView = useCyto((s) => s.setView);
  const on = view === "textbook";
  const [run, setRun] = useState(0);
  useEffect(() => {
    if (on) setRun((r) => r + 1);
  }, [on]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-30 flex items-center justify-center px-3 pb-6 pt-20 transition-all duration-700 ease-[cubic-bezier(0.3,1.3,0.4,1)] sm:px-6",
        on ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
      )}
      aria-hidden={!on}
    >
      <div
        className={cn(
          "paper-lined shadow-paper relative w-full max-w-[560px] rounded-[1.75rem] px-4 pb-5 pt-5 transition-transform duration-700 ease-[cubic-bezier(0.3,1.3,0.4,1)] sm:px-7",
          on ? "rotate-[-1.2deg] scale-100" : "rotate-6 scale-50",
        )}
      >
        <span aria-hidden className="absolute -top-3 left-10 h-6 w-20 -rotate-6 rounded-sm bg-primary/25" />
        <span aria-hidden className="absolute -top-3 right-10 h-6 w-20 rotate-3 rounded-sm bg-mint/70" />
        <div className="flex items-baseline justify-between gap-3 pl-8">
          <h2 className="font-display text-2xl italic text-foreground sm:text-3xl">Fig. 1 — The Animal Cell</h2>
          <span className="hidden text-xs text-muted-foreground sm:block">Name: ____________</span>
        </div>

        <svg key={run} viewBox="0 0 420 410" className={cn("mt-1 w-full", on && "tb-on")} role="img" aria-label="A flat textbook drawing of a cell with labels">
          <g fill="none" strokeLinecap="round" strokeLinejoin="round" className="stroke-ink">
            <circle cx="210" cy="215" r="135" pathLength={1} strokeWidth="3" className="tb-draw fill-blush/60" style={d(0)} />
            <circle cx="215" cy="200" r="42" pathLength={1} strokeWidth="2.2" className="tb-draw fill-lavender-soft" style={d(1)} />
            <circle cx="224" cy="206" r="13" pathLength={1} strokeWidth="1.8" className="tb-draw fill-lavender" style={d(2)} />
            {[0, 1, 2].map((i) => (
              <path
                key={i}
                pathLength={1}
                strokeWidth="1.8"
                className="tb-draw stroke-pink"
                style={d(3 + i)}
                d={`M${266 + i * 12} ${168 - i * 4} C ${290 + i * 12} 185, ${268 + i * 12} 200, ${292 + i * 12} 216 S ${272 + i * 12} 246, ${296 + i * 10} ${262 + i * 4}`}
              />
            ))}
            {[0, 1, 2, 3].map((i) => (
              <path key={i} pathLength={1} strokeWidth="2" className="tb-draw stroke-mint" style={d(6 + i)} d={`M${114 + i * 3} ${134 + i * 9} Q 142 ${122 + i * 9} ${170 - i * 3} ${134 + i * 9}`} />
            ))}
            <g transform="rotate(-22 152 304)">
              <ellipse cx="152" cy="304" rx="30" ry="14" pathLength={1} strokeWidth="2" className="tb-draw fill-mint-soft" style={d(10)} />
              <polyline points="128,304 134,296 140,312 146,296 152,312 158,296 164,312 170,296 176,304" pathLength={1} strokeWidth="1.4" className="tb-draw" style={d(11)} />
            </g>
            <g transform="rotate(28 262 316)">
              <ellipse cx="262" cy="316" rx="22" ry="11" pathLength={1} strokeWidth="2" className="tb-draw fill-mint-soft" style={d(12)} />
              <polyline points="244,316 249,309 254,322 259,309 264,322 269,309 274,322 280,316" pathLength={1} strokeWidth="1.3" className="tb-draw" style={d(13)} />
            </g>
          </g>
          <g className="fill-pink tb-label" style={{ transitionDelay: "1.4s" }}>
            {[[280, 182], [289, 205], [284, 232], [299, 250], [301, 270], [306, 226], [312, 196], [296, 178]].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="2.6" />
            ))}
          </g>
          {LABELS.map((l, i) => (
            <g key={l.text} className="tb-label" style={{ transitionDelay: `${1.5 + i * 0.1}s` }}>
              <line
                x1={l.side === "l" ? l.x + l.text.length * 6.4 + 4 : l.x - l.text.length * 6.4 - 4}
                y1={l.y - 4}
                x2={l.to[0]}
                y2={l.to[1]}
                strokeWidth="1"
                className="stroke-mauve"
              />
              <circle cx={l.to[0]} cy={l.to[1]} r="2" className="fill-ink" />
              <text x={l.x} y={l.y} textAnchor={l.side === "l" ? "start" : "end"} className="fill-ink font-sans text-[12px]">
                {l.text}
              </text>
            </g>
          ))}
        </svg>

        <div className="mt-1 flex flex-col items-center gap-3 border-t border-dashed border-border pt-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-sm text-muted-foreground">
            The version you memorised. Flat, still, and <em className="font-display text-base text-foreground">empty</em>.
          </p>
          <Button variant="hero" size="pill" onClick={() => setView("reality")}>
            see reality <ArrowRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
