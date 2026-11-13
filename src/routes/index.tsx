import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import Experience from "@/cyto/scene/Experience";
import { Header } from "@/cyto/ui/Header";
import { IntroOverlay } from "@/cyto/ui/IntroOverlay";
import { InfoCard } from "@/cyto/ui/InfoCard";
import { Controls } from "@/cyto/ui/Controls";
import { Textbook } from "@/cyto/ui/Textbook";
import { useTour } from "@/cyto/ui/useTour";
import { live, useCyto } from "@/cyto/store";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "CYTO SPACE — Fly inside a living cell" },
      {
        name: "description",
        content:
          "Scroll from a tiny dot through the membrane into a 3D cell. Watch kinesin walk, ribosomes build, and ATP synthase spin.",
      },
      { property: "og:title", content: "CYTO SPACE — Fly inside a living cell" },
      {
        property: "og:description",
        content: "The cell you only saw as a labelled circle, in interactive 3D. Made for curious students.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CytoSpace,
});

function CytoSpace() {
  const phase = useCyto((s) => s.phase);
  const view = useCyto((s) => s.view);
  const setFocus = useCyto((s) => s.setFocus);
  const stopTour = useCyto((s) => s.stopTour);
  const iris = useRef<HTMLDivElement>(null);
  const flash = useRef<HTMLDivElement>(null);
  useTour();

  useEffect(() => {
    live.irisEl = iris.current;
    live.flashEl = flash.current;
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = phase === "explore" ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [phase]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        stopTour();
        setFocus(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setFocus, stopTour]);

  return (
    <main className="relative bg-hero font-sans">
      <Experience />
      <div ref={flash} aria-hidden className="bg-membrane-flash pointer-events-none fixed inset-0 z-10 opacity-0" />
      <div ref={iris} aria-hidden className="bg-iris pointer-events-none fixed inset-0 z-10 opacity-0" />
      <IntroOverlay />
      <Header />
      <Textbook />
      {phase === "explore" && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex flex-col gap-2 p-3 sm:p-5">
          {view === "reality" && <InfoCard />}
          <Controls />
        </div>
      )}
      <div aria-hidden style={{ height: "420vh" }} />
    </main>
  );
}
