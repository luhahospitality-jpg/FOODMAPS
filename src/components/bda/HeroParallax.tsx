"use client";

import { useEffect } from "react";

export default function HeroParallax() {
  useEffect(() => {
    const img = document.getElementById("bda-hero-bg");
    if (!img) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (img) {
          img.style.transform = `translateY(${y * 0.15}px) scale(1.08)`;
        }
        ticking = false;
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return null;
}
