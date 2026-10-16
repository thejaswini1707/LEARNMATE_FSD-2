import { STATUS } from "../../config";

export default function Badge({ tone, dot, children, className = "" }) {
  return (
    <span className={`badge ${tone ? `badge--${tone}` : ""} ${className}`}>
      {dot && <span className="dot" aria-hidden="true" />}
      {children}
    </span>
  );
}

const STATUS_TONE = {
  [STATUS.PENDING]: "warning",
  [STATUS.CONFIRMED]: "primary",
  [STATUS.COMPLETED]: "success",
  [STATUS.DECLINED]: "danger",
  [STATUS.CANCELLED]: "",
};

export function StatusBadge({ status }) {
  return <Badge tone={STATUS_TONE[status]} dot>{status}</Badge>;
}
