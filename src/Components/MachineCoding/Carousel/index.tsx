import { Carousel } from "./Carousel";
import "../../Hooks/hook-demo.css";

const slides = [10, 20, 30, 40].map((id, i) => ({
  src: `https://picsum.photos/id/${id}/800/400`,
  alt: `Sample photo ${i + 1}`,
}));

export const CarouselDemo = () => {
  return (
    <section>
      <h2>Image carousel / slider</h2>
      <p>
        Writeup: <code>src/Components/MachineCoding/Carousel/Carousel.md</code>.
        The browser does the sliding (CSS scroll-snap); React only reads which
        slide is showing and asks for a different one.
      </p>
      <div className="demo-card">
        <h4>Scroll-snap carousel with autoplay</h4>
        <p>
          Swipe, use the arrows, or click the track and press ← →. Autoplay
          pauses while the mouse is over it or keyboard focus is inside, and
          restarts its countdown whenever you change slide.
        </p>
        <Carousel slides={slides} label="Sample photos" />
      </div>
    </section>
  );
};
