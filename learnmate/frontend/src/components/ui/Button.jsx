import { Link } from "react-router-dom";

/* Variants: primary | secondary | ghost | danger | danger-ghost | light | mateup | hero-outline. Renders a <Link> when `to` is set. */
export default function Button({
  variant = "primary", size, block, icon: Icon, iconRight: IconRight, iconOnly, loading, to, className = "", children, disabled, type = "button", ...rest
}) {
  const classes = ["btn", `btn--${variant}`, size && `btn--${size}`, block && "btn--block", iconOnly && "btn--icon", className]
    .filter(Boolean).join(" ");
  const content = (
    <>
      {loading ? <span className="spinner" aria-hidden="true" /> : Icon && <Icon size={size === "sm" ? 15 : 17} aria-hidden="true" />}
      {children}
      {IconRight && <IconRight size={17} aria-hidden="true" />}
    </>
  );
  if (to && !disabled) return <Link to={to} className={classes} {...rest}>{content}</Link>;
  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {content}
    </button>
  );
}
