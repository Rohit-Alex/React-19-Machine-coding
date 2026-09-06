import { useWindowSize } from "./useWindowSize";

export const WindowSizeDisplay = () => {
  const { width, height } = useWindowSize();
  const breakpoint = width < 640 ? "mobile" : width < 1024 ? "tablet" : "desktop";

  return (
    <div>
      <h3>Reading the viewport: width, height</h3>
      <p>
        <code>useWindowSize</code> subscribes to the window's{" "}
        <code>resize</code> event and returns the current{" "}
        <code>innerWidth</code>/<code>innerHeight</code>. Resize the browser
        window (or rotate a device emulator) to watch these numbers, and the
        derived <code>breakpoint</code> below, update live.
      </p>
      <ul>
        <li>Width: {width}px</li>
        <li>Height: {height}px</li>
        <li>Breakpoint: {breakpoint}</li>
      </ul>
    </div>
  );
};
