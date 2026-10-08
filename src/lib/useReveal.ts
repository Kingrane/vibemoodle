import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

/**
 * Плавное появление блока при попадании во вьюпорт.
 *
 * Реализовано на scroll/resize-проверке, а не на IntersectionObserver:
 * IO не срабатывает, если пользователь «перепрыгнул» через блок (якорь,
 * резкий скролл), и контент остаётся прозрачным. Здесь же любой блок,
 * который оказался на экране или выше него, гарантированно проявляется.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(delay = 0) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      setVisible(true);
      return;
    }

    let frame = 0;

    const cleanup = () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };

    const check = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.92) {
        setVisible(true);
        cleanup();
      }
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    check();

    return cleanup;
  }, []);

  return {
    ref,
    className: visible ? "reveal is-in" : "reveal",
    style: { "--reveal-delay": `${delay}ms` } as CSSProperties,
  };
}
