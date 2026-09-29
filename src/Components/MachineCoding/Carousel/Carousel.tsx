import { useEffect, useRef, useState } from "react";

export interface Slide {
  src: string;
  alt: string;
}

interface CarouselProps {
  slides: Slide[];
  label: string;
  /** Autoplay delay in ms. */
  interval?: number;
}

// The scroll position is the single source of truth. Buttons, dots and
// autoplay only ask the browser to scroll; the scroll handler works out which
// slide is showing. So a swipe, a trackpad flick or an arrow key can never
// leave the dots out of sync.
const slideAt = (el: HTMLElement) =>
  Math.round(el.scrollLeft / el.clientWidth);

const scrollToSlide = (el: HTMLElement, index: number, count: number) => {
  const wrapped = (index + count) % count; // -1 → last, count → 0
  el.scrollTo({
    left: wrapped * el.clientWidth,
    behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "instant"
      : "smooth",
  });
};

export const Carousel = ({ slides, label, interval = 5000 }: CarouselProps) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  // Autoplay starts off for people who asked the OS for less motion.
  const [stopped, setStopped] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const count = slides.length;
  const playing = !stopped && !hovered && !keyboardFocus && count > 1;

  const goTo = (index: number) => {
    if (trackRef.current) scrollToSlide(trackRef.current, index, count);
  };

  // setTimeout keyed on `current`, not setInterval: any slide change — manual
  // or automatic — restarts the countdown, so the user always gets a full
  // `interval` on the slide they picked.
  useEffect(() => {
    if (!playing) return;
    const id = setTimeout(() => {
      const el = trackRef.current;
      if (el) scrollToSlide(el, slideAt(el) + 1, count);
    }, interval);
    return () => clearTimeout(id);
  }, [current, playing, interval, count]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label={label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      // Pause for keyboard users only. A mouse click also focuses the button,
      // and that focus would otherwise keep autoplay paused after they leave.
      onFocus={(e) => setKeyboardFocus(e.target.matches(":focus-visible"))}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setKeyboardFocus(false);
      }}
      style={{ position: "relative", maxWidth: 800 }}
    >
      <div
        ref={trackRef}
        tabIndex={0} // Arrow keys scroll it natively, snapping slide by slide.
        aria-live={playing ? "off" : "polite"}
        onScroll={(e) => setCurrent(slideAt(e.currentTarget))}
        style={{
          display: "flex",
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          scrollbarWidth: "none",
          borderRadius: 8,
        }}
      >
        {slides.map((slide, i) => (
          <div
            key={slide.src}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            style={{
              flex: "0 0 100%",
              scrollSnapAlign: "start",
              scrollSnapStop: "always", // A hard flick moves one slide, not three.
            }}
          >
            <img
              src={slide.src}
              alt={slide.alt}
              width={800}
              height={400}
              loading={i === 0 ? "eager" : "lazy"}
              draggable={false}
              style={{ display: "block", width: "100%", height: "auto" }}
            />
          </div>
        ))}
      </div>

      <div className="demo-actions" style={{ justifyContent: "center" }}>
        <button onClick={() => goTo(current - 1)} aria-label="Previous slide">
          ‹
        </button>
        {slides.map((slide, i) => (
          <button
            key={slide.src}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === current}
            style={{ fontWeight: i === current ? 700 : 400 }}
          >
            {i === current ? "●" : "○"}
          </button>
        ))}
        <button onClick={() => goTo(current + 1)} aria-label="Next slide">
          ›
        </button>
        <button onClick={() => setStopped((s) => !s)}>
          {stopped ? "Play" : "Pause"}
        </button>
      </div>
    </section>
  );
};
