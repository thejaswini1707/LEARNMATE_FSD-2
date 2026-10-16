import { LuStar } from "react-icons/lu";

export function Stars({ value = 0, size = 16 }) {
  const full = Math.round(value);
  return (
    <span className="stars" role="img" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <LuStar key={n} size={size} className={n <= full ? "" : "off"} fill={n <= full ? "currentColor" : "none"} aria-hidden="true" />
      ))}
    </span>
  );
}

export function RatingSummary({ rating, count, size = 15 }) {
  if (!count) return <span className="rating">No reviews yet</span>;
  return (
    <span className="rating">
      <Stars value={rating} size={size} />
      <span><strong>{rating.toFixed(1)}</strong> ({count})</span>
    </span>
  );
}

const LABELS = ["Needs improvement", "Average", "Good", "Very good", "Excellent"];

export function StarInput({ value, onChange, invalid, id }) {
  return (
    <div className="star-input" role="radiogroup" aria-label="Rating" aria-invalid={invalid || undefined} id={id}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n} type="button" role="radio" aria-checked={value === n} data-on={n <= value}
          aria-label={`${n} star${n > 1 ? "s" : ""} – ${LABELS[n - 1]}`} onClick={() => onChange(n)}
        >
          <LuStar size={28} fill={n <= value ? "currentColor" : "none"} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
