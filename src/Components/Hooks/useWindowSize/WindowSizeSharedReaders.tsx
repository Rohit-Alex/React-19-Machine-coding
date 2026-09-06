import { useWindowSize } from "./useWindowSize";

const Reader = ({ label }: { label: string }) => {
  const { width, height } = useWindowSize();

  return (
    <li>
      {label}: {width}px x {height}px
    </li>
  );
};

export const WindowSizeSharedReaders = () => {
  return (
    <div>
      <h3>The fix: useSyncExternalStore</h3>
      <p>
        Same three readers, but now each calls <code>useWindowSize()</code> —
        the <code>useSyncExternalStore</code>-based hook. No matter how many
        instances mount, there is exactly one <code>resize</code> listener
        and one cached <code>{"{ width, height }"}</code> object shared by
        all of them, so every instance always reads the same reference at the
        same time. That's what rules out the tearing risk from the version
        above — there's only one snapshot to be inconsistent with.
      </p>
      <ul>
        <Reader label="Reader A" />
        <Reader label="Reader B" />
        <Reader label="Reader C" />
      </ul>
    </div>
  );
};
