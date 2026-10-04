import { MultiStepForm } from "./MultiStepForm";
import "../../Hooks/hook-demo.css";

export const MultiStepFormDemo = () => (
  <section>
    <h2>Multi-step form / wizard</h2>
    <p>
      Writeup: <code>src/Components/MachineCoding/MultiStepForm/MultiStepForm.md</code>. One data
      object, validation per step, a step that only appears for business accounts.
    </p>
    <div className="demo-card">
      <h4>Create an account</h4>
      <p>Try Next with empty fields, go Back (nothing is lost), and switch to "business".</p>
      <MultiStepForm />
    </div>
  </section>
);
