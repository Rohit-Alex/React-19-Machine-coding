import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useMediaState } from "./useMediaState";

const SPEEDS = [0.5, 1, 1.25, 1.5, 2];
const HIDE_AFTER_MS = 2500;

export const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds)) return "0:00"; // NaN before metadata; Infinity for live streams.
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor(s / 60) % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
};

export const VideoPlayer = ({ src, title }: { src: string; title: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const media = useMediaState(videoRef);

  // While dragging the seek bar, show the drag position, not the video's
  // time — otherwise timeupdate keeps pulling the thumb back under the mouse.
  const [scrubTime, setScrubTime] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [announcement, setAnnouncement] = useState("");
  const hideTimer = useRef(0);

  const video = () => videoRef.current!;
  const duration = Number.isFinite(media.duration) ? media.duration : 0;
  const shownTime = scrubTime ?? media.currentTime;

  const togglePlay = () => {
    const v = video();
    if (v.paused || v.ended) {
      // play() returns a promise. It rejects if a pause() lands first
      // (AbortError) or autoplay is blocked (NotAllowedError) — not a crash.
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  };

  const seekTo = (time: number) => {
    video().currentTime = Math.max(0, Math.min(duration, time));
  };

  const seekBy = (delta: number) => {
    seekTo(video().currentTime + delta);
    setAnnouncement(`${delta > 0 ? "Forward" : "Back"} ${Math.abs(delta)} seconds`);
  };

  const changeVolume = (delta: number) => {
    const v = video();
    v.volume = Math.max(0, Math.min(1, Math.round((v.volume + delta) * 10) / 10));
    v.muted = v.volume === 0;
    setAnnouncement(`Volume ${Math.round(v.volume * 100)}%`);
  };

  const toggleFullscreen = () => {
    // The container, not the <video>: fullscreening the video element shows
    // the browser's own controls and hides ours.
    if (document.fullscreenElement) document.exitFullscreen();
    else containerRef.current?.requestFullscreen().catch(() => {});
  };

  // Track fullscreen from the event, because Esc exits it without our button.
  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Auto-hide: controls fade after a pause in mouse movement, only while playing.
  const wake = () => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setShowControls(false), HIDE_AFTER_MS);
  };
  useEffect(() => () => clearTimeout(hideTimer.current), []);
  const controlsVisible = showControls || media.isPaused;

  // Shortcuts on the player, not the window: two players on a page, or a text
  // field elsewhere, mustn't react to Space.
  const onKeyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement;
    // A focused slider or button handles its own keys (arrows on the seek
    // bar, Space on a button). Don't do the action twice.
    const isControl = target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "BUTTON";
    const actions: Record<string, () => void> = {
      k: togglePlay,
      " ": togglePlay,
      j: () => seekBy(-10),
      l: () => seekBy(10),
      ArrowLeft: () => seekBy(-5),
      ArrowRight: () => seekBy(5),
      ArrowUp: () => changeVolume(0.1),
      ArrowDown: () => changeVolume(-0.1),
      m: () => (video().muted = !video().muted),
      f: toggleFullscreen,
    };
    const action = actions[event.key];
    if (!action || (isControl && (event.key === " " || event.key.startsWith("Arrow")))) return;
    event.preventDefault(); // Space and arrows would otherwise scroll the page.
    action();
    wake();
  };

  const progress = duration ? (shownTime / duration) * 100 : 0;
  const buffered = duration ? (media.bufferedEnd / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={`Video player: ${title}`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseMove={wake}
      onFocus={() => {
        // Keyboard users: keep controls up while focus is in the player.
        clearTimeout(hideTimer.current);
        setShowControls(true);
      }}
      style={{
        position: "relative",
        background: "#000",
        maxWidth: isFullscreen ? "none" : 640,
        lineHeight: 0,
        cursor: controlsVisible ? "auto" : "none",
      }}
    >
      <video
        ref={videoRef}
        src={src}
        preload="metadata"
        playsInline // iOS would otherwise jump to its own fullscreen player.
        onClick={togglePlay}
        style={{ width: "100%", height: isFullscreen ? "100vh" : "auto" }}
      />

      {media.isWaiting && (
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#fff", fontSize: 14 }}>
          Buffering…
        </div>
      )}

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          padding: "24px 10px 8px",
          lineHeight: "normal",
          color: "#fff",
          background: "linear-gradient(transparent, rgb(0 0 0 / 0.75))",
          opacity: controlsVisible ? 1 : 0,
          transition: "opacity 200ms",
        }}
      >
        {/* Buffered amount drawn behind the native range input. */}
        <div style={{ position: "relative", height: 16 }}>
          <div style={{ position: "absolute", top: 6, left: 0, right: 0, height: 4, background: "rgb(255 255 255 / 0.25)" }} />
          <div style={{ position: "absolute", top: 6, left: 0, width: `${buffered}%`, height: 4, background: "rgb(255 255 255 / 0.5)" }} />
          <div style={{ position: "absolute", top: 6, left: 0, width: `${progress}%`, height: 4, background: "#e53935" }} />
          <input
            type="range"
            aria-label="Seek"
            // Read out as "1:05 of 3:20", not "65".
            aria-valuetext={`${formatTime(shownTime)} of ${formatTime(duration)}`}
            min={0}
            max={duration || 0}
            step={0.1}
            value={shownTime}
            disabled={!duration}
            onChange={(event) => {
              const time = Number(event.target.value);
              // Mouse drag: just move the thumb. Keyboard: seek straight away.
              if (scrubTime !== null) setScrubTime(time);
              else seekTo(time);
            }}
            onPointerDown={(event) => {
              // Capture, so pointerup still reaches us if the drag ends outside the bar.
              event.currentTarget.setPointerCapture(event.pointerId);
              setScrubTime(media.currentTime);
            }}
            onPointerCancel={() => setScrubTime(null)}
            onPointerUp={(event) => {
              seekTo(Number(event.currentTarget.value)); // One seek on release, not hundreds while dragging.
              setScrubTime(null);
            }}
            style={{ position: "absolute", inset: 0, width: "100%", margin: 0, opacity: 0, cursor: "pointer" }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, fontSize: 13 }}>
          <button onClick={togglePlay} aria-label={media.isPaused ? "Play (k)" : "Pause (k)"} style={BUTTON}>
            {media.isEnded ? "↺" : media.isPaused ? "▶" : "❚❚"}
          </button>
          <button onClick={() => (video().muted = !video().muted)} aria-label={media.isMuted ? "Unmute (m)" : "Mute (m)"} style={BUTTON}>
            {media.isMuted || media.volume === 0 ? "🔇" : "🔊"}
          </button>
          <input
            type="range"
            aria-label="Volume"
            aria-valuetext={`${Math.round((media.isMuted ? 0 : media.volume) * 100)}%`}
            min={0}
            max={1}
            step={0.05}
            value={media.isMuted ? 0 : media.volume}
            onChange={(event) => {
              const v = video();
              v.volume = Number(event.target.value);
              v.muted = v.volume === 0;
            }}
            style={{ width: 70 }}
          />
          <span style={{ fontVariantNumeric: "tabular-nums" }}>
            {formatTime(shownTime)} / {formatTime(duration)}
          </span>
          <span style={{ flex: 1 }} />
          <select aria-label="Playback speed" value={media.rate} onChange={(event) => (video().playbackRate = Number(event.target.value))}>
            {SPEEDS.map((speed) => (
              <option key={speed} value={speed}>
                {speed}×
              </option>
            ))}
          </select>
          {document.pictureInPictureEnabled && (
            <button
              onClick={() =>
                (document.pictureInPictureElement ? document.exitPictureInPicture() : video().requestPictureInPicture()).catch(() => {})
              }
              aria-label="Picture in picture"
              style={BUTTON}
            >
              ⧉
            </button>
          )}
          <button onClick={toggleFullscreen} aria-label={isFullscreen ? "Exit full screen (f)" : "Full screen (f)"} style={BUTTON}>
            {isFullscreen ? "⤡" : "⤢"}
          </button>
        </div>
      </div>
      <p aria-live="polite" className="visually-hidden">
        {announcement}
      </p>
    </div>
  );
};

const BUTTON = { background: "none", border: 0, color: "inherit", font: "inherit", fontSize: 16, cursor: "pointer", padding: 4 };
