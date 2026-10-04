# Video player control bar (LLD)

> **The prompt:** "Build custom controls for a `<video>`: play/pause, a seek
> bar with buffered progress, time, volume, speed, full screen, and keyboard
> shortcuts."
>
> Each control is small. What's being tested is **who owns the state**: the
> video element already knows if it's playing, where it is and how loud it
> is. Copy that into React the wrong way and the buttons start lying.

Runnable demo: [`index.tsx`](./index.tsx) · player:
[`VideoPlayer.tsx`](./VideoPlayer.tsx) · state hook:
[`useMediaState.ts`](./useMediaState.ts)

---

## 1. Clarify before you design

| Question | Why it changes the design |
| --- | --- |
| Plain MP4, or adaptive streaming (HLS / DASH)? | Streaming needs a library (hls.js, Shaka) feeding the element; quality switching becomes a control. The control bar stays the same. |
| Live streams? | `duration` is `Infinity`; the seek bar becomes "back to live". |
| Which shortcuts? | YouTube's (k, j, l, m, f, arrows) are what users know. |
| Captions? | `<track kind="captions">` plus a CC button toggling `textTracks[i].mode`. |
| Mobile? | `playsInline`, bigger touch targets, tap to show controls instead of hover. |
| Ads, chapters, thumbnails on hover? | Extra layers on the seek bar; follow-ups. |

---

## 2. The element is the source of truth

```
 button click ──► video.play() / video.currentTime = t   (command)
                         │
                 "play", "timeupdate", … events
                         ▼
             useMediaState: setState(read(video))        (copy)
                         ▼
                   controls render
```

- **Buttons never set React state directly.** Play calls `video.play()`;
  the `play` event then updates `isPaused`. If the button set `isPaused =
  false` itself and the browser refused to play (autoplay rules, an error),
  the button would show ❚❚ on a stopped video.
- **Other things change the video too:** the user presses the hardware media
  key, the OS picture-in-picture window, the video ends, it stalls. Only the
  events see all of those.
- **One `read()` for every event** — it copies all fields at once. Simpler
  than a handler per event, and it can't forget a field.

Analogy: a car's speedometer. It reads the wheels; it doesn't remember how
hard you pressed the pedal. If the car is going uphill, the needle is still
right.

### Events that matter

`play`, `pause`, `ended`, `timeupdate` (~4 times a second), `durationchange` /
`loadedmetadata`, `progress` (buffering), `waiting` / `playing` (stalls),
`volumechange`, `ratechange`, `seeked`. `duration` is `NaN` until metadata
loads — `formatTime` shows `0:00` for `NaN` and `Infinity`.

---

## 3. The seek bar

- **A native `<input type="range">`**, made invisible, on top of drawn bars.
  Keyboard (arrows, Home, End) and screen readers work for free.
  `aria-valuetext="1:05 of 3:20"` so it isn't read as "65".
- **Scrubbing state.** While dragging, the thumb follows `scrubTime`, not the
  video's time — otherwise `timeupdate` keeps pulling the thumb back under
  the mouse. Seek **once on release**, not on every pixel of the drag (each
  seek can start a network request).
- **Pointer capture on press**, so the release still reaches the bar if the
  mouse ends outside it; `pointercancel` clears the drag.
- **Buffered bar:** `video.buffered` is a list of ranges (there can be gaps
  after seeking). Show the end of the range that contains the playhead.

---

## 4. Things that bite

1. **`play()` returns a promise.** It rejects if `pause()` happens first
   (`AbortError`) or autoplay with sound is blocked (`NotAllowedError`).
   Unhandled, it's an error in the console on every quick double click.
2. **Full screen the container, not the `<video>`.** A full-screen video
   element shows the browser's controls and hides yours. Track the state from
   `fullscreenchange`, because Esc leaves full screen without your button.
3. **Shortcuts on the player, not `window`.** Two players, or a comment box
   on the page, must not react to Space. And skip Space/arrows when focus is
   on a slider or button — they already handle those keys, so the action
   would run twice.
4. **`preventDefault` on Space and arrows**, or the page scrolls as well.
5. **Volume: keep `muted` separate from `volume`.** Unmute should restore the
   old level, not jump to 100%. Dragging volume to 0 sets muted; dragging up
   unmutes.
6. **Auto-hide controls only while playing**, show them on mouse move and
   while focus is inside the player — keyboard users must never tab into
   invisible buttons. Hide the cursor with them.
7. **`playsInline`**, or iPhones open their own full-screen player on play.

---

## 5. Accessibility

- Every icon button has an `aria-label` that changes with state ("Play (k)" /
  "Pause (k)") — the shortcut in the label makes it discoverable.
- The player is a labelled `region` with `tabIndex={0}`, so shortcuts work
  after one Tab.
- Jumps and volume changes are announced in a polite live region ("Forward 10
  seconds", "Volume 60%") — otherwise a keyboard shortcut does something
  silent.
- Captions (`<track>`) are the biggest accessibility feature of a video
  player; name them even if not built.
- Respect `prefers-reduced-motion` for any animated controls.

---

## 6. Follow-ups to expect

| They ask | Short answer |
| --- | --- |
| "HLS / adaptive bitrate." | `hls.js` attaches to the same `<video>` (Safari plays HLS natively). Quality menu = `hls.levels`; "Auto" lets it switch on bandwidth. The control bar doesn't change — that's the point of keeping the element as the source of truth. |
| "Thumbnail preview on hover." | Precomputed sprite sheet (one image, a grid of frames) + a VTT file mapping time ranges to sprite positions. On hover, work out the time under the pointer and show that tile. |
| "Remember where I stopped." | Save `currentTime` (throttled) to storage per video id; seek there on `loadedmetadata`. |
| "Re-renders on every `timeupdate`." | ~4 a second, only the control bar — fine. If heavy, put the time display in its own small component, or read time with `requestAnimationFrame` into a ref and write to the DOM. |
| "Media keys / lock screen controls." | `navigator.mediaSession.metadata` and `setActionHandler("play" | "pause" | "seekforward" …)`. |
| "Several players on one page." | Everything is per instance already; pause others when one plays (a tiny shared store of "who's playing"). |

---

## 7. Scoring notes

- **Mid:** play/pause and a seek bar with `isPlaying` in React state, set by
  the buttons; seek bar fights the mouse; shortcuts on `window`.
- **Senior:** the element as the single source of truth with event-driven
  state, `play()` promise handled, scrubbing separated from playback with one
  seek on release, buffered ranges, container full screen tracked by event,
  scoped shortcuts that don't double-fire, mute/volume kept apart, auto-hide
  that respects focus, and labelled controls with `aria-valuetext`.
