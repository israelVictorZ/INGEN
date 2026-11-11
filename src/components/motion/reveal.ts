"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";

gsap.registerPlugin(ScrollTrigger, ScrambleTextPlugin, DrawSVGPlugin);

const st = (el: Element, start = "top 88%") => ({ trigger: el, start, once: true });

/**
 * Anima um elemento marcado com `data-reveal="tipo"`:
 *   up | fade | split | stagger | scramble | count | bar | draw | scale
 * Opcionais: data-delay, data-to, data-decimals, data-suffix
 */
export function revealElement(el: HTMLElement, reduce: boolean) {
  const type = el.dataset.reveal;
  const delay = Number(el.dataset.delay ?? 0);
  if (reduce) {
    gsap.set(el, { autoAlpha: 1 });
    return;
  }
  switch (type) {
    case "up":
      gsap.fromTo(el, { autoAlpha: 0, y: 48 }, { autoAlpha: 1, y: 0, duration: 1.1, delay, ease: "expo.out", scrollTrigger: st(el) });
      break;
    case "fade":
      gsap.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.2, delay, ease: "power2.out", scrollTrigger: st(el) });
      break;
    case "scale":
      gsap.fromTo(el, { autoAlpha: 0, scale: 0.94 }, { autoAlpha: 1, scale: 1, duration: 1.1, delay, ease: "expo.out", scrollTrigger: st(el) });
      break;
    case "split":
      // palavras já vêm divididas do servidor (<Split>), só animamos
      gsap.set(el, { autoAlpha: 1 });
      gsap.from(el.querySelectorAll("[data-w]"), { yPercent: 115, duration: 1.1, delay, ease: "expo.out", stagger: 0.04, scrollTrigger: st(el) });
      break;
    case "stagger":
      gsap.set(el, { autoAlpha: 1 });
      gsap.fromTo(
        el.children,
        { autoAlpha: 0, y: 36 },
        { autoAlpha: 1, y: 0, duration: 0.9, delay, ease: "expo.out", stagger: 0.07, scrollTrigger: st(el) },
      );
      break;
    case "scramble": {
      const text = el.textContent ?? "";
      gsap.set(el, { autoAlpha: 1 });
      gsap.to(el, {
        duration: 1.4,
        delay,
        ease: "none",
        scrambleText: { text, chars: "0123456789#%<>/", revealDelay: 0.3, speed: 0.5 },
        scrollTrigger: st(el),
      });
      break;
    }
    case "count": {
      const to = Number(el.dataset.to ?? el.textContent ?? 0);
      const dec = Number(el.dataset.decimals ?? 0);
      const suffix = el.dataset.suffix ?? "";
      const obj = { v: 0 };
      gsap.set(el, { autoAlpha: 1 });
      el.textContent = (0).toFixed(dec) + suffix;
      gsap.to(obj, {
        v: to,
        duration: 1.6,
        delay,
        ease: "expo.out",
        scrollTrigger: st(el),
        onUpdate: () => {
          el.textContent = obj.v.toFixed(dec) + suffix;
        },
      });
      break;
    }
    case "bar":
      gsap.fromTo(el, { autoAlpha: 1, scaleX: 0 }, { scaleX: 1, transformOrigin: "left center", duration: 1.4, delay, ease: "expo.out", scrollTrigger: st(el, "top 95%") });
      break;
    case "draw":
      gsap.set(el, { autoAlpha: 1 });
      gsap.fromTo(
        el.querySelectorAll("[data-draw]"),
        { drawSVG: "0%" },
        { drawSVG: "100%", duration: 1.8, delay, ease: "power2.inOut", stagger: 0.15, scrollTrigger: st(el, "top 80%") },
      );
      break;
    default:
      gsap.set(el, { autoAlpha: 1 });
  }
}
