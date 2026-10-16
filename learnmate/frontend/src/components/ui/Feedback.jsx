import { LuInbox, LuTriangleAlert } from "react-icons/lu";
import Button from "./Button";

export function Skeleton({ width = "100%", height = 14, style }) {
  return <span className="skeleton" style={{ width, height, ...style }} aria-hidden="true" />;
}

export function CardSkeletons({ count = 3, height = 170 }) {
  return (
    <div className="grid-cards" role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div className="card" key={i} style={{ padding: 20, display: "grid", gap: 12 }}>
          <Skeleton width="55%" height={18} />
          <Skeleton width="80%" />
          <Skeleton height={height - 90} />
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 4 }) {
  return (
    <div style={{ display: "grid", gap: 14 }} role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} height={38} />)}
    </div>
  );
}

export function EmptyState({ icon: Icon = LuInbox, title, message, action, compact }) {
  return (
    <div className={`state ${compact ? "state--compact" : ""}`}>
      <span className="state__icon"><Icon size={24} aria-hidden="true" /></span>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message = "Unable to load your data. Please check your connection and try again.", onRetry }) {
  return (
    <div className="state state--error" role="alert">
      <span className="state__icon"><LuTriangleAlert size={24} aria-hidden="true" /></span>
      <h3>Something went wrong</h3>
      <p>{message}</p>
      {onRetry && <Button variant="secondary" onClick={onRetry}>Try again</Button>}
    </div>
  );
}
