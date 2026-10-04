import { Suspense, use, useState, useTransition, type ReactNode } from "react";
import { ErrorBoundary } from "../ErrorBoundaries/ErrorBoundary";
import { clearCache, getPosts, getUser, type Post, type User } from "./cache";
import "../../Hooks/hook-demo.css";

type Mode = "parallel" | "waterfall";

const since = (start: number) => `${Math.round((performance.now() - start) / 100) / 10}s`;

const Profile = ({ userPromise, start, children }: { userPromise: Promise<User>; start: number; children?: ReactNode }) => {
  const user = use(userPromise); // Suspends until the user arrives.
  return (
    <>
      <p>
        👤 <strong>{user.name}</strong> <small>(shown at {since(start)})</small>
      </p>
      {children}
    </>
  );
};

const Posts = ({ postsPromise, start }: { postsPromise: Promise<Post[]>; start: number }) => {
  const posts = use(postsPromise); // A rejected promise is thrown → nearest error boundary.
  return (
    <ul style={{ margin: 0 }}>
      {posts.map((p) => (
        <li key={p.id}>{p.title}</li>
      ))}
      <li style={{ listStyle: "none" }}>
        <small>posts shown at {since(start)}</small>
      </li>
    </ul>
  );
};

// Asks for posts only when it renders — which, inside Profile, is after the
// user has loaded. (Module level: a component defined inside another is a
// new type every render and would remount.)
const WaterfallPosts = ({ userId, start }: { userId: number; start: number }) => <Posts postsPromise={getPosts(userId)} start={start} />;

const PostsBoundary = ({ children }: { children: ReactNode }) => (
  <ErrorBoundary
    fallback={({ error, reset }) => (
      <p role="alert">
        {error.message}.{" "}
        <button
          onClick={() => {
            clearCache(); // Otherwise the retry reads the same rejected promise.
            reset();
          }}
        >
          Retry
        </button>
      </p>
    )}
  >
    <Suspense fallback={<p>Loading posts…</p>}>{children}</Suspense>
  </ErrorBoundary>
);

const Page = ({ userId, mode, oneBoundary, start }: { userId: number; mode: Mode; oneBoundary: boolean; start: number }) => {
  if (mode === "waterfall") {
    // Two waits, one after the other.
    return (
      <Profile userPromise={getUser(userId)} start={start}>
        <PostsBoundary>
          <WaterfallPosts userId={userId} start={start} />
        </PostsBoundary>
      </Profile>
    );
  }
  // Parallel: both requests start here, before anything suspends.
  const userPromise = getUser(userId);
  const postsPromise = getPosts(userId);
  if (oneBoundary) {
    // One Suspense for both: nothing shows until everything is ready.
    return (
      <ErrorBoundary fallback={({ error }) => <p role="alert">{error.message}</p>}>
        <Suspense fallback={<p>Loading profile and posts…</p>}>
          <Profile userPromise={userPromise} start={start} />
          <Posts postsPromise={postsPromise} start={start} />
        </Suspense>
      </ErrorBoundary>
    );
  }
  return (
    <>
      <Suspense fallback={<p>Loading profile…</p>}>
        <Profile userPromise={userPromise} start={start} />
      </Suspense>
      <PostsBoundary>
        <Posts postsPromise={postsPromise} start={start} />
      </PostsBoundary>
    </>
  );
};

export const SuspenseDataDemo = () => {
  const [userId, setUserId] = useState(1);
  const [mode, setMode] = useState<Mode>("parallel");
  const [oneBoundary, setOneBoundary] = useState(false);
  const [useTransitions, setUseTransitions] = useState(true);
  const [run, setRun] = useState({ n: 0, start: performance.now() });
  const [isPending, startTransition] = useTransition();

  const restart = () => {
    clearCache();
    setRun((r) => ({ n: r.n + 1, start: performance.now() }));
  };

  const pickUser = (id: number) => {
    const update = () => {
      setUserId(id);
      setRun((r) => ({ n: r.n, start: performance.now() }));
    };
    // In a transition, React keeps the old user on screen until the new one is ready.
    if (useTransitions) startTransition(update);
    else update();
  };

  return (
    <section>
      <h2>Suspense for data fetching</h2>
      <p>
        Writeup: <code>src/Components/Patterns/SuspenseData/SuspenseData.md</code>. Components read
        data with <code>use(promise)</code>; <code>Suspense</code> shows a fallback while it loads.
        User takes 0.8s, posts 1.2s.
      </p>
      <div className="demo-card">
        <fieldset style={{ border: 0, padding: 0 }}>
          <legend>Fetching</legend>
          <label style={{ display: "block" }}>
            <input type="radio" name="suspense-mode" checked={mode === "parallel"} onChange={() => {
                setMode("parallel");
                restart();
              }} /> Parallel
            — both requests start together (~1.2s)
          </label>
          <label style={{ display: "block" }}>
            <input type="radio" name="suspense-mode" checked={mode === "waterfall"} onChange={() => {
                setMode("waterfall");
                restart();
              }} />{" "}
            Waterfall — posts start after the user loads (~2s)
          </label>
        </fieldset>
        <label style={{ display: "block" }}>
          <input type="checkbox" checked={oneBoundary} disabled={mode === "waterfall"} onChange={(e) => {
              setOneBoundary(e.target.checked);
              restart();
            }} />{" "}
          One Suspense boundary for both (parallel only)
        </label>
        <label style={{ display: "block" }}>
          <input type="checkbox" checked={useTransitions} onChange={(e) => setUseTransitions(e.target.checked)} /> Switch users
          in a transition
        </label>
        <div className="demo-actions">
          {[1, 2, 3].map((id) => (
            <button key={id} aria-pressed={id === userId} onClick={() => pickUser(id)}>
              User {id}
              {id === 3 ? " (posts fail)" : ""}
            </button>
          ))}
          <button onClick={restart}>Reload (clear cache)</button>
          {isPending && <span>Loading next user…</span>}
        </div>
        <div style={{ opacity: isPending ? 0.5 : 1, minHeight: 120 }}>
          <Page key={`${run.n}-${mode}-${oneBoundary}`} userId={userId} mode={mode} oneBoundary={oneBoundary} start={run.start} />
        </div>
      </div>
    </section>
  );
};
