import { useActionState } from "react";

function updateName(name: string): Promise<string | null> {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (!name.trim()) {
        resolve("Name can't be empty.");
      } else {
        resolve(null);
      }
    }, 1000);
  });
}

export const UpdateNameForm = () => {
  const [error, submitAction, isPending] = useActionState(
    async (_previousError: string | null, formData: FormData) => {
      const name = String(formData.get("name") ?? "");
      return await updateName(name);
    },
    null,
  );

  return (
    <div>
      <h3>Basic form action: state, dispatchAction, isPending</h3>
      <p>
        <code>reducerAction</code> reads <code>formData</code>, "saves" the
        name after a fake network delay, and returns an error string (or{" "}
        <code>null</code>). <code>submitAction</code> is passed straight to{" "}
        <code>{'<form action={submitAction}>'}</code> — React wires up
        dispatch and the pending state for us, no manual{" "}
        <code>startTransition</code> needed for a real <code>&lt;form&gt;</code>
        .
      </p>
      <form action={submitAction}>
        <input type="text" name="name" placeholder="Your name" />
        <button type="submit" disabled={isPending}>
          {isPending ? "Updating..." : "Update"}
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
    </div>
  );
};
