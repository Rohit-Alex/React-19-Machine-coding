import { Component, Suspense, use, useState } from "react";

function fetchMessage(shouldFail: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (shouldFail) {
        reject(new Error("The message failed to download."));
      } else {
        resolve("Here is the message you downloaded.");
      }
    }, 1500);
  });
}

function Message({ messagePromise }: { messagePromise: Promise<string> }) {
  const messageContent = use(messagePromise);
  return <p>{messageContent}</p>;
}

class MessageErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return <p role="alert">Error: {this.state.error.message}</p>;
    }
    return this.props.children;
  }
}

export const ReadPromiseWithSuspense = () => {
  const [attempt, setAttempt] = useState(0);
  const [messagePromise, setMessagePromise] = useState<Promise<string> | null>(
    null,
  );

  const download = (shouldFail: boolean) => {
    setMessagePromise(fetchMessage(shouldFail));
    setAttempt((a) => a + 1);
  };

  return (
    <div>
      <h3>Reading a Promise with Suspense + an error boundary</h3>
      <p>
        The Promise is created once per click, inside the event handler — the
        docs warn that a Promise created directly during render in a Client
        Component is recreated on every render, which would re-suspend
        forever. <code>Message</code> calls <code>use(messagePromise)</code>;
        the <code>Suspense</code> fallback shows while it's pending, and the
        error boundary (a hand-written class component — this repo has no
        <code>react-error-boundary</code> dependency) catches it if it
        rejects.
      </p>
      <button onClick={() => download(false)}>
        Download message (succeeds)
      </button>{" "}
      <button onClick={() => download(true)}>
        Download message (fails)
      </button>
      {messagePromise && (
        <MessageErrorBoundary key={attempt}>
          <Suspense fallback={<p>Downloading message...</p>}>
            <Message messagePromise={messagePromise} />
          </Suspense>
        </MessageErrorBoundary>
      )}
    </div>
  );
};
