import type { Marker } from "mapbox-gl";

export type PinBounceOptions = {
  duration?: number; // total duration in ms
  bounces?: number; // number of bounces
  height?: number; // bounce height in px
};

/**
 * Subtle bounce animation for a Mapbox marker element.
 * Call this when the address is saved or confirmed.
 */
export function animatePinBounce(
  marker: Marker,
  opts: PinBounceOptions = {},
): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const el = marker?.getElement?.() as HTMLElement & {
    __pinWrap?: HTMLElement;
  };
  if (!el) return Promise.resolve();

  // Ensure we animate a child wrapper, not the root (Mapbox uses transform for positioning)
  const target = (() => {
    if (el.__pinWrap && el.contains(el.__pinWrap)) return el.__pinWrap;
    const wrap = document.createElement("div");
    wrap.style.display = "inline-block";
    // move existing children into the wrapper
    while (el.firstChild) wrap.appendChild(el.firstChild);
    el.appendChild(wrap);
    el.__pinWrap = wrap;
    return wrap;
  })();

  const duration = Math.max(200, opts.duration ?? 600);
  const bounces = Math.max(1, Math.min(6, opts.bounces ?? 2));
  const height = Math.max(4, Math.min(24, opts.height ?? 12));

  // Use Web Animations API when available
  if ("animate" in target && typeof target.animate === "function") {
    const frames: Keyframe[] = [{ transform: "translateY(0px) scale(1)" }];
    for (let i = 0; i < bounces; i++) {
      const decay = Math.pow(0.6, i);
      const y = -height * decay;
      const s = 1 + 0.02 * decay;
      frames.push({ transform: `translateY(${y}px) scale(${s})` });
      frames.push({ transform: "translateY(0px) scale(1)" });
    }

    target.style.willChange = "transform";
    const anim = target.animate(frames, {
      duration,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)", // easeOutBack-ish
      fill: "none",
    });

    return anim.finished
      .then(() => void 0)
      .catch(() => void 0)
      .finally(() => {
        target.style.willChange = "";
      });
  }

  // Fallback: simple JS tween
  return new Promise<void>((resolve) => {
    target.style.willChange = "transform";
    let start: number | null = null;

    const step = (t: number) => {
      if (start == null) start = t;
      const p = Math.min(1, (t - start) / duration);

      // Bounce easing: damped sine
      const amp = height;
      const decay = Math.exp(-6 * p);
      const y = -Math.sin(p * Math.PI * (1 + bounces)) * amp * decay;
      const s = 1 + 0.02 * decay;
      target.style.transform = `translateY(${y.toFixed(2)}px) scale(${s.toFixed(3)})`;

      if (p < 1) requestAnimationFrame(step);
      else {
        target.style.transform = "translateY(0px) scale(1)";
        target.style.willChange = "";
        resolve();
      }
    };

    requestAnimationFrame(step);
  });
}

/**
 * A slightly more celebratory bounce used on "Save" success.
 */
export async function animatePinSaved(marker: Marker): Promise<void> {
  await animatePinBounce(marker, { duration: 800, bounces: 2, height: 14 });
  const root = marker?.getElement?.() as HTMLElement & {
    __pinWrap?: HTMLElement;
  };
  if (!root) return;
  const target = root.__pinWrap ?? root;
  if (!("animate" in target && typeof target.animate === "function")) return;
  await target
    .animate(
      [
        { transform: "translateY(0px) scale(1)" },
        { transform: "translateY(0px) scale(2)" },
        { transform: "translateY(0px) scale(1)" },
      ],
      { duration: 200, easing: "ease-out" },
    )
    .finished.catch(() => void 0);
}
