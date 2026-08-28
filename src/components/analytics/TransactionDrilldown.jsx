import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const euro = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

export default function TransactionDrilldown({ detail, onClose, onEdit }) {
  useEffect(() => {
    if (!detail) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [detail, onClose]);

  if (!detail || typeof document === "undefined") return null;

  const rows = Array.isArray(detail.rows) ? [...detail.rows] : [];
  rows.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

  const total = rows.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-slate-950/75 p-0 backdrop-blur-md sm:items-center sm:p-6"
      onMouseDown={onClose}
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="transaction-drilldown-title"
        className="relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[2rem] border border-slate-200 bg-white shadow-2xl shadow-black/30 dark:border-white/10 dark:bg-slate-900 sm:max-h-[86vh] sm:rounded-[2rem]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-white/95 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95 sm:p-6">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[.16em] text-blue-600 dark:text-emerald-400">
              Dettaglio dati
            </p>
            <h2
              id="transaction-drilldown-title"
              className="mt-2 truncate text-2xl font-black text-slate-950 dark:text-white"
            >
              {detail.title}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {rows.length} movimenti · {euro.format(total)}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            aria-label="Chiudi dettaglio"
          >
            <X size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
          {rows.length > 0 ? (
            <div className="space-y-2">
              {rows.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onEdit(item)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-transparent bg-slate-50 p-3 text-left transition hover:border-slate-200 hover:bg-white dark:bg-slate-800/50 dark:hover:border-slate-700 dark:hover:bg-slate-800"
                >
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-slate-950 dark:text-white">
                      {item.description}
                    </strong>
                    <span className="text-xs text-slate-400">
                      {new Date(`${item.date}T12:00:00`).toLocaleDateString(
                        "it-IT",
                      )}{" "}
                      · {item.category || "Da classificare"}
                    </span>
                  </span>

                  <strong
                    className={
                      item.type === "income"
                        ? "shrink-0 text-emerald-600"
                        : "shrink-0 text-rose-600"
                    }
                  >
                    {item.type === "income" ? "+" : "−"}
                    {euro.format(item.amount)}
                  </strong>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid min-h-40 place-items-center rounded-2xl border border-dashed border-slate-300 text-center text-sm text-slate-400 dark:border-slate-700">
              Nessun movimento disponibile.
            </div>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}
