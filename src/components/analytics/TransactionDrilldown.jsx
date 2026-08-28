import { X } from "lucide-react";
const euro = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});
export default function TransactionDrilldown({ detail, onClose, onEdit }) {
  if (!detail) return null;
  const total = detail.rows.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0,
  );
  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/65 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={onClose}
    >
      <section
        className="max-h-[88vh] w-full max-w-2xl overflow-auto rounded-t-[2rem] bg-white p-6 shadow-2xl dark:bg-slate-900 sm:rounded-[2rem]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[.16em] text-blue-600 dark:text-emerald-400">
              Dettaglio dati
            </p>
            <h2 className="mt-2 text-2xl font-black dark:text-white">
              {detail.title}
            </h2>
            <p className="text-sm text-slate-400">
              {detail.rows.length} movimenti · {euro.format(total)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-5 space-y-2">
          {detail.rows
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onEdit(item)}
                className="flex w-full gap-3 rounded-2xl bg-slate-50 p-3 text-left dark:bg-slate-800/50"
              >
                <span className="min-w-0 flex-1">
                  <strong className="block truncate dark:text-white">
                    {item.description}
                  </strong>
                  <span className="text-xs text-slate-400">
                    {new Date(`${item.date}T12:00:00`).toLocaleDateString(
                      "it-IT",
                    )}{" "}
                    · {item.category || "Da classificare"}
                  </span>
                </span>
                <strong className="text-rose-600">
                  −{euro.format(item.amount)}
                </strong>
              </button>
            ))}
        </div>
      </section>
    </div>
  );
}
