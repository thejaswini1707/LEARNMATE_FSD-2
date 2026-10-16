import { Link } from "react-router-dom";
import { LuChevronRight } from "react-icons/lu";

/*
  Page top section. Every page passes what is useful FOR THAT PAGE:
    breadcrumbs - where you are      eyebrow - small context label     meta - quick facts / stats
    actions     - primary controls   children - contextual controls (e.g. the search box)
  variant="hero" gives the dashboard-style welcome band; the default is a clean title block.
*/
export default function PageHeader({ title, description, actions, breadcrumbs, eyebrow, meta, children, variant = "plain" }) {
  return (
    <header className={`page-header page-header--${variant}`}>
      {breadcrumbs?.length > 0 && (
        <nav className="crumbs" aria-label="Breadcrumb">
          <ol>
            {breadcrumbs.map((c, i) => (
              <li key={c.label}>
                {c.to && i < breadcrumbs.length - 1 ? <Link to={c.to}>{c.label}</Link> : <span aria-current={i === breadcrumbs.length - 1 ? "page" : undefined}>{c.label}</span>}
                {i < breadcrumbs.length - 1 && <LuChevronRight size={14} aria-hidden="true" />}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="page-header__row">
        <div className="page-header__text">
          {eyebrow && <span className="page-header__eyebrow">{eyebrow}</span>}
          <h1>{title}</h1>
          {description && <p>{description}</p>}
          {meta?.length > 0 && (
            <ul className="page-header__meta">
              {meta.map((m) => <li key={m.label}><strong>{m.value}</strong> {m.label}</li>)}
            </ul>
          )}
        </div>
        {actions && <div className="page-header__actions">{actions}</div>}
      </div>
      {children && <div className="page-header__extra">{children}</div>}
    </header>
  );
}
