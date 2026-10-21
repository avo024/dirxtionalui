import { Icon } from "@/components/ui/icon";
import "@/lists.css";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}

/** "Showing 1–9 of 9" left; Prev / Next text buttons right. The page number only appears past one page. */
export function Pagination({ page, pageSize, total, onPage }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const cur = Math.min(page, pages);
  const start = total === 0 ? 0 : (cur - 1) * pageSize + 1;
  const end = Math.min(cur * pageSize, total);
  return (
    <nav className="pg" aria-label="Pagination">
      <span className="pg-n">Showing <b>{start}–{end}</b> of <b>{total}</b></span>
      <div className="pg-r">
        {pages > 1 && <span className="pg-pg">Page {cur} of {pages}</span>}
        <button type="button" className="pg-b" disabled={cur === 1} onClick={() => onPage(cur - 1)}>
          <Icon name="chevron-left" size={14} />Prev
        </button>
        <button type="button" className="pg-b" disabled={cur === pages} onClick={() => onPage(cur + 1)}>
          Next<Icon name="chevron-right" size={14} />
        </button>
      </div>
    </nav>
  );
}
