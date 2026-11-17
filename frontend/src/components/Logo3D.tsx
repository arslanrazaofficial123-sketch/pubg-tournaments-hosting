"use client";

import { useEffect, useRef } from "react";

const SRC = "/images/logo.png";
const LAYERS = 20;
const STEP = 1.6;

/** Layered 3D Epix logo that tilts with the cursor (visual only). */
export function Logo3D({ className = "" }: { className?: string }) {
  const art = useRef<HTMLDivElement>(null);
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const a = art.current;
    const e = el.current;
    if (!a || !e) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      e.style.transform = "rotateY(-12deg)";
      return;
    }
    let rx = 0, ry = 0, tx = 0, ty = 0, hover = false, raf = 0;
    const t0 = performance.now();
    const move = (ev: PointerEvent) => {
      const r = a.getBoundingClientRect();
      ty = ((ev.clientX - r.left) / r.width - 0.5) * 70;
      tx = -((ev.clientY - r.top) / r.height - 0.5) * 50;
      hover = true;
    };
    const leave = () => { hover = false; };
    a.addEventListener("pointermove", move);
    a.addEventListener("pointerleave", leave);
    const frame = (t: number) => {
      const s = (t - t0) / 1000;
      if (!hover) { tx = Math.sin(s * 0.7) * 8; ty = Math.sin(s * 0.5) * 26; }
      rx += (tx - rx) * 0.08;
      ry += (ty - ry) * 0.08;
      e.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      a.removeEventListener("pointermove", move);
      a.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <div ref={art} className={`relative grid aspect-square place-items-center [perspective:900px] ${className}`}>
      <div className="pointer-events-none absolute inset-[6%] rounded-full bg-[radial-gradient(circle,rgba(255,122,26,0.38),transparent_66%)] blur-[30px]" />
      <i className="logo3d-ring pointer-events-none absolute inset-[4%] rounded-full border border-dashed border-accent/35" />
      <i className="logo3d-ring logo3d-ring-b pointer-events-none absolute inset-[16%] rounded-full border border-accent/20" />
      <div ref={el} className="relative aspect-square w-[62%] will-change-transform [transform-style:preserve-3d]" role="img" aria-label="EPIX Esports logo">
        {Array.from({ length: LAYERS }).map((_, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={SRC} alt="" draggable={false}
            className="absolute inset-0 h-full w-full [filter:brightness(0.32)_saturate(1.3)]"
            style={{ transform: `translateZ(${-i * STEP}px)` }} />
        ))}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={SRC} alt="EPIX Esports" draggable={false}
          className="absolute inset-0 h-full w-full [filter:drop-shadow(0_0_30px_rgba(255,122,26,0.38))]"
          style={{ transform: "translateZ(6px)" }} />
      </div>
    </div>
  );
}
