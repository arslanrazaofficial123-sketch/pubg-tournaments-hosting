"use client";

import { useEffect, useRef } from "react";

/** Faint falling-code background for the hero (visual only). */
export function MatrixRain({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const x = c?.getContext("2d");
    if (!c || !x) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, cols = 0, drops: number[] = [];
    const chars = "01ABCDEF47";
    const size = () => {
      W = c.width = c.offsetWidth; H = c.height = c.offsetHeight;
      cols = Math.ceil(W / 18);
      drops = Array.from({ length: cols }, () => (Math.random() * H) / 18);
    };
    const draw = () => {
      x.fillStyle = "rgba(5,5,5,0.12)"; x.fillRect(0, 0, W, H);
      x.fillStyle = "#FF7A1A"; x.font = "13px monospace"; x.globalAlpha = 0.55;
      for (let i = 0; i < cols; i++) {
        x.fillText(chars[(Math.random() * chars.length) | 0], i * 18, drops[i] * 18);
        if (drops[i] * 18 > H && Math.random() > 0.975) drops[i] = 0;
        drops[i] += 0.5;
      }
      x.globalAlpha = 1;
    };
    size();
    window.addEventListener("resize", size);
    const id = reduce ? 0 : window.setInterval(draw, 70);
    if (reduce) draw();
    return () => { window.removeEventListener("resize", size); if (id) clearInterval(id); };
  }, []);
  return <canvas ref={ref} aria-hidden className={className} />;
}
