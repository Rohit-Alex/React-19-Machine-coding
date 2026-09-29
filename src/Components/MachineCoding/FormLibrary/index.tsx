import { SignupForm } from "./SignupForm";
import "../../Hooks/hook-demo.css";

export const FormLibraryDemo = () => {
  return (
    <section>
      <h2>Form library like React Hook Form (LLD)</h2>
      <p>
        Writeup: <code>src/Components/MachineCoding/FormLibrary/FormLibrary.md</code>. A small{" "}
        <code>useForm</code> with register, handleSubmit, watch, setValue, getValues, reset,
        formState, plus useWatch / useController / useFormState.
      </p>
      <div className="demo-card">
        <h4>Sign-up form built on it</h4>
        <p>
          Watch the render counters. Typing in a text box re-renders nothing: the value lives in
          the input, not in React state. The form re-renders when an error appears or clears; the
          strength meter only while the password is typed; the plan picker only when the plan
          changes. Validation mode is <code>onTouched</code>: first check on leaving a field, then
          on every change.
        </p>
        <SignupForm />
      </div>
    </section>
  );
};
