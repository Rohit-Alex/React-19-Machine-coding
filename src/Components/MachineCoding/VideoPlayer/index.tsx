import { VideoPlayer } from "./VideoPlayer";
import "../../Hooks/hook-demo.css";

// A short CC0 sample clip hosted by MDN.
const SRC = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

export const VideoPlayerDemo = () => (
  <section>
    <h2>Video player control bar (LLD)</h2>
    <p>
      Writeup: <code>src/Components/MachineCoding/VideoPlayer/VideoPlayer.md</code>. The{" "}
      <code>&lt;video&gt;</code> element is the source of truth; the controls read its events and
      call its methods.
    </p>
    <div className="demo-card">
      <h4>Custom controls</h4>
      <p>
        Click the player, then try k / Space (play), j / l (±10s), ← / → (±5s), ↑ / ↓ (volume), m
        (mute), f (full screen). Drag the seek bar; controls hide while playing if the mouse stops.
      </p>
      <VideoPlayer src={SRC} title="Flower" />
    </div>
  </section>
);
