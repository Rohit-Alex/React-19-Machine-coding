import { useId, useState } from "react";
import "./StarRating.css";

interface StarRatingProps {
  label: string;
  value: number; // 0 = not rated yet
  onChange: (value: number) => void;
  max?: number;
}

/*
 * A rating is "pick one of five" — a radio group. Real radios give us arrow
 * keys, Tab as one stop, form submission and screen-reader wording for free.
 * The stars are only how it looks.
 */
export const StarRating = ({ label, value, onChange, max = 5 }: StarRatingProps) => {
  const [hoverValue, setHoverValue] = useState(0);
  const name = useId(); // Radios group by name; two ratings on a page mustn't share one.
  // Hover previews, but never changes, the real value.
  const shown = hoverValue || value;

  return (
    <fieldset className="star-rating" onMouseLeave={() => setHoverValue(0)}>
      <legend className="visually-hidden">{label}</legend>
      {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
        <label key={star} onMouseEnter={() => setHoverValue(star)}>
          <input
            type="radio"
            className="visually-hidden"
            name={name}
            value={star}
            checked={value === star}
            onChange={() => onChange(star)}
          />
          <span className={`star ${star <= shown ? "on" : ""}`} aria-hidden="true">
            ★
          </span>
          <span className="visually-hidden">
            {star} {star === 1 ? "star" : "stars"}
          </span>
        </label>
      ))}
    </fieldset>
  );
};

/** Read-only, fractional: 3.7 fills three and a bit stars. */
export const StarDisplay = ({ value, max = 5 }: { value: number; max?: number }) => {
  const stars = "★".repeat(max);
  return (
    // One image with one label, instead of five unlabelled glyphs.
    <span role="img" aria-label={`${value.toFixed(1)} out of ${max} stars`} style={{ position: "relative", display: "inline-block", fontSize: 20 }}>
      <span aria-hidden="true" style={{ color: "#c9c9c9" }}>
        {stars}
      </span>
      {/* Same stars in gold on top, clipped to the right width. */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: `${(Math.min(value, max) / max) * 100}%`,
          overflow: "hidden",
          whiteSpace: "nowrap",
          color: "#e8a317",
        }}
      >
        {stars}
      </span>
    </span>
  );
};
