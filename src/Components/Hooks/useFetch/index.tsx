import "../hook-demo.css";
import { UserLookup } from "./UserLookup";

export const UseFetchDemo = () => {
  return (
    <section>
      <h2>useFetch</h2>
      <p>
        A custom hook (not part of the React API) that wraps the browser's{" "}
        <code>fetch</code>, tracking <code>data</code>, <code>error</code>,
        and <code>isLoading</code>, and aborting a stale request whenever the
        url changes or the component unmounts.
      </p>
      <UserLookup />
    </section>
  );
};
