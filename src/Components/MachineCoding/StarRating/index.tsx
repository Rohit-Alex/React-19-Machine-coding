import { useState } from "react";
import { StarDisplay, StarRating } from "./StarRating";
import "../../Hooks/hook-demo.css";

const EXISTING = [5, 4, 4, 3, 5, 2, 4];
const LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

export const StarRatingDemo = () => {
  const [rating, setRating] = useState(0);
  const all = rating ? [...EXISTING, rating] : EXISTING;
  const average = all.reduce((sum, n) => sum + n, 0) / all.length;

  return (
    <section>
      <h2>Star rating</h2>
      <p>
        Writeup: <code>src/Components/MachineCoding/StarRating/StarRating.md</code>. A radio group
        dressed as stars, plus a read-only display for averages.
      </p>
      <div className="demo-card">
        <h4>Rate this product</h4>
        <p>Hover to preview, click to set. Or Tab in and use the arrow keys.</p>
        <StarRating label="Your rating" value={rating} onChange={setRating} />
        <p aria-live="polite">{rating ? `You rated it ${rating}: ${LABELS[rating]}` : "Not rated yet"}</p>
        <div className="demo-actions">
          <button onClick={() => setRating(0)} disabled={rating === 0}>
            Clear rating
          </button>
        </div>
        <p>
          Average: <StarDisplay value={average} /> {average.toFixed(1)} from {all.length} ratings
        </p>
      </div>
    </section>
  );
};
