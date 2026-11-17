"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const COLORS = ["#1FAEE9", "#E6F4FB", "#7FE0FF"];
const LENGTH = 18;

/** Glowing trail that follows the mouse (desktop only, off in the admin panel). */
export function CursorTrail() {
  const ref = useRef<HTMLCanvasElement>(null);
  const path = usePathname();
  const off = path?.startsWith("/admin");

  useEffect(() => {
    const c = ref.current;
    if (off || !c) return;
    if (window.matchMedia("(hover: none)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const x = c.getContext("2d");
    if (!x) return;
    const pts: { x: number; y: number }[] = [];
    let raf = 0;

    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    const move = (e: MouseEvent) => { pts.push({ x: e.clientX, y: e.clientY }); };
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", move);

    const draw = () => {
      x.clearRect(0, 0, c.width, c.height);
      if (pts.length > LENGTH || (pts.length && Math.random() < 0.4)) pts.shift();
      for (let j = 0; j < 3; j++) {
        x.beginPath();
        x.lineWidth = 7 - j * 2;
        x.lineCap = "round";
        x.lineJoin = "round";
        x.strokeStyle = COLORS[j];
        x.globalAlpha = 1 - j * 0.2;
        x.shadowColor = COLORS[0];
        x.shadowBlur = 14;
        pts.forEach((p, i) => {
          const o = (j - 1) * 3 * (i / LENGTH);
          if (i) x.lineTo(p.x + o, p.y + o); else x.moveTo(p.x + o, p.y + o);
        });
        x.stroke();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", move);
    };
  }, [off]);

  if (off) return null;
  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-[200] h-full w-full" />;
}
