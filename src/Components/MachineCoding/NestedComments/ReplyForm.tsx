interface ReplyFormProps {
  label: string;
  onSubmit: (text: string) => void;
  onCancel?: () => void;
}

// React 19 form action: React clears an uncontrolled form after the action
// runs, so no `value` state is needed to empty the input.
export const ReplyForm = ({ label, onSubmit, onCancel }: ReplyFormProps) => (
  <form
    className="demo-actions"
    action={(data) => {
      const text = String(data.get("text") ?? "").trim();
      if (text) onSubmit(text);
    }}
  >
    <input
      name="text"
      aria-label={label}
      placeholder={label}
      required
      autoFocus={Boolean(onCancel)} // Inline reply boxes, not the top one.
    />
    <button>Post</button>
    {onCancel && (
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
    )}
  </form>
);
