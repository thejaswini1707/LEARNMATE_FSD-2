import { useMemo, useState } from "react";
import { LuArrowUpDown } from "react-icons/lu";
import Pagination from "./Pagination";

/*
  columns: [{ key, header, render(row), sortValue?(row) }]
  Below 760px the table becomes stacked cards (see layout.css) using data-label.
*/
export default function DataTable({ columns, rows, rowKey, pageSize = 8, initialSort, empty }) {
  const [sort, setSort] = useState(initialSort || null);
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    const value = col?.sortValue || (() => "");
    return [...rows].sort((a, b) => {
      const x = value(a); const y = value(b);
      const order = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
      return sort.dir === "asc" ? order : -order;
    });
  }, [rows, sort, columns]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pages);
  const visible = sorted.slice((current - 1) * pageSize, current * pageSize);

  const toggle = (key) => setSort((s) => (s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  if (!rows.length) return empty || null;
  return (
    <>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" aria-sort={sort?.key === c.key ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}>
                  {c.sortValue ? (
                    <button type="button" className="sort-btn" onClick={() => toggle(c.key)}>
                      {c.header}<LuArrowUpDown size={13} aria-hidden="true" />
                    </button>
                  ) : c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((c) => <td key={c.key} data-label={c.header}>{c.render(row)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={current} pages={pages} total={sorted.length} pageSize={pageSize} onChange={setPage} />
    </>
  );
}
