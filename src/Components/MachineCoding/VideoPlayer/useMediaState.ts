import { useEffect, useState, type RefObject } from "react";

export interface MediaState {
  isPaused: boolean;
  isEnded: boolean;
  isWaiting: boolean; // Buffering: playing, but out of data.
  currentTime: number;
  duration: number; // NaN until metadata loads.
  bufferedEnd: number; // How far ahead is downloaded, from the current position.
  volume: number;
  isMuted: boolean;
  rate: number;
}

const INITIAL: MediaState = {
  isPaused: true,
  isEnded: false,
  isWaiting: false,
  currentTime: 0,
  duration: NaN,
  bufferedEnd: 0,
  volume: 1,
  isMuted: false,
  rate: 1,
};

// Every event that can change something we show.
const EVENTS = [
  "play",
  "pause",
  "ended",
  "waiting",
  "playing",
  "timeupdate",
  "durationchange",
  "loadedmetadata",
  "progress",
  "volumechange",
  "ratechange",
  "seeked",
] as const;

/*
 * The <video> element is the source of truth. React state is only a copy of
 * it, refreshed from its events. Buttons call methods on the element
 * (play(), currentTime = …) and never set this state themselves — the
 * element's event then updates it. One direction, so they can't disagree.
 */
export function useMediaState(ref: RefObject<HTMLVideoElement | null>) {
  const [state, setState] = useState(INITIAL);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    const read = () => {
      // The buffered range that contains the playhead (there can be gaps).
      let bufferedEnd = 0;
      for (let i = 0; i < video.buffered.length; i++) {
        if (video.buffered.start(i) <= video.currentTime && video.currentTime <= video.buffered.end(i)) {
          bufferedEnd = video.buffered.end(i);
        }
      }
      setState({
        isPaused: video.paused,
        isEnded: video.ended,
        isWaiting: video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA && !video.paused,
        currentTime: video.currentTime,
        duration: video.duration,
        bufferedEnd,
        volume: video.volume,
        isMuted: video.muted,
        rate: video.playbackRate,
      });
    };

    read(); // Metadata may already be loaded (cached video).
    EVENTS.forEach((name) => video.addEventListener(name, read));
    return () => EVENTS.forEach((name) => video.removeEventListener(name, read));
  }, [ref]);

  return state;
}
