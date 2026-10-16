import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
import Button from "./Button";

export default function Pagination({ page, pages, total, pageSize, onChange }) {
  if (total <= pageSize) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <nav className="pagination" aria-label="Pagination">
      <span className="pagination__info">Showing {from}–{to} of {total}</span>
      <div className="pagination__controls">
        <Button variant="secondary" size="sm" iconOnly icon={LuChevronLeft} disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page" />
        <span>Page {page} of {pages}</span>
        <Button variant="secondary" size="sm" iconOnly icon={LuChevronRight} disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page" />
      </div>
    </nav>
  );
}
