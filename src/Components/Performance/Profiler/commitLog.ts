import type { ProfilerOnRenderCallback } from "react";

export interface Commit {
  n: number;
  id: string;
  phase: "mount" | "update" | "nested-update";
  actualDuration: number; // Time spent rendering what actually re-rendered.
  baseDuration: number; // Estimated time to re-render the whole subtree with no memo.
}

/*
 * A tiny store outside React. onRender runs during React's commit, so it
 * must not set state directly (that would cause another commit, and another
 * onRender, forever). It records, and tells the log view a moment later.
 */
let commits: Commit[] = [];
let n = 0;
let scheduled = false;
const listeners = new Set<() => void>();

export const onRender: ProfilerOnRenderCallback = (id, phase, actualDuration, baseDuration) => {
  commits = [{ n: ++n, id, phase, actualDuration, baseDuration }, ...commits].slice(0, 12);
  if (scheduled) return;
  scheduled = true;
  setTimeout(() => {
    scheduled = false;
    listeners.forEach((l) => l());
  });
};

export const commitLog = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  get: () => commits,
  clear() {
    commits = [];
    listeners.forEach((l) => l());
  },
};
