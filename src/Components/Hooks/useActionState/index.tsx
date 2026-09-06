import "../hook-demo.css";
import { KnownVsUnknownErrors } from "./KnownVsUnknownErrors";
import { UpdateNameForm } from "./UpdateNameForm";

export const UseActionStateDemo = () => {
  return (
    <section>
      <h2>useActionState</h2>
      <p>
        Full writeup: <code>src/Components/Hooks/useActionState/useActionState.md</code>.
        Runs an async reducer in response to a form/Action submission,
        returning the latest state, a dispatch function, and a pending flag —
        without hand-rolling <code>isLoading</code>/<code>error</code> state.
      </p>
      <UpdateNameForm />
      <KnownVsUnknownErrors />
    </section>
  );
};
