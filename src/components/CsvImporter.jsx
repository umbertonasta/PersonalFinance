import { useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  FileSpreadsheet,
  LoaderCircle,
  UploadCloud,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseHypeCsv } from "@/lib/csvImport";

export default function CsvImporter({ rules, onImport, onClose }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);

  async function readFile(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Seleziona un file CSV esportato da HYPE.");
      return;
    }

    setError("");
    setResult(null);
    setFileName(file.name);

    try {
      const text = await file.text();
      setResult(parseHypeCsv(text, rules));
    } catch (readError) {
      setError(readError.message || "Non è stato possibile leggere il file.");
    }
  }

  async function confirmImport() {
    if (!result?.transactions.length || importing) return;
    setImporting(true);
    setError("");

    try {
      await onImport(result.transactions);
    } catch (importError) {
      setError(importError.message || "Importazione non riuscita.");
      setImporting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-500">
            Importazione HYPE
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
            Importa i movimenti
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            Il file viene letto nel browser. Prima del salvataggio puoi controllare
            il riepilogo e le transazioni dubbie finiranno nel limbo.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 hover:text-slate-950 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white"
          aria-label="Chiudi importazione"
        >
          <X size={18} />
        </button>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          readFile(event.dataTransfer.files?.[0]);
        }}
        className={`flex min-h-52 w-full flex-col items-center justify-center rounded-[1.75rem] border-2 border-dashed p-6 text-center transition ${
          dragging
            ? "border-emerald-400 bg-emerald-400/10"
            : "border-slate-300 bg-slate-50/70 hover:border-blue-400 hover:bg-blue-50/60 dark:border-slate-700 dark:bg-slate-800/40 dark:hover:border-emerald-400 dark:hover:bg-emerald-400/5"
        }`}
      >
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-emerald-400">
          <UploadCloud size={25} />
        </span>
        <strong className="mt-4 text-slate-950 dark:text-white">
          Trascina qui il CSV oppure selezionalo
        </strong>
        <span className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Formato movimenti HYPE, estensione .csv
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(event) => readFile(event.target.files?.[0])}
      />

      {error && (
        <div className="flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <>
          <div className="rounded-[1.5rem] border border-slate-200 bg-white/80 p-5 dark:border-white/10 dark:bg-slate-800/55">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
                <FileSpreadsheet size={21} />
              </span>
              <div className="min-w-0">
                <strong className="block truncate text-slate-950 dark:text-white">
                  {fileName}
                </strong>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  File letto correttamente
                </span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Summary label="Movimenti" value={result.summary.total} />
              <Summary label="Entrate" value={result.summary.income} />
              <Summary label="Spese" value={result.summary.expenses} />
              <Summary label="Automatiche" value={result.summary.automatic} />
              <Summary label="Nel limbo" value={result.summary.review} warning />
              <Summary label="In sospeso" value={result.summary.pending} />
            </div>
          </div>

          <div className="max-h-64 space-y-2 overflow-auto pr-1">
            {result.transactions.slice(0, 12).map((transaction) => (
              <div
                key={transaction.external_id}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-white/10 dark:bg-slate-800/45"
              >
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-sm dark:bg-slate-900">
                  {transaction.review_status === "verified" ? "✓" : "?"}
                </span>
                <div className="min-w-0 flex-1">
                  <strong className="block truncate text-sm text-slate-950 dark:text-white">
                    {transaction.description}
                  </strong>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {transaction.date} · {transaction.category || transaction.suggested_category || "Da classificare"}
                  </span>
                </div>
                <strong className={transaction.type === "income" ? "text-emerald-600" : "text-rose-600"}>
                  {transaction.type === "income" ? "+" : "−"}
                  {transaction.amount.toFixed(2)} €
                </strong>
              </div>
            ))}
            {result.transactions.length > 12 && (
              <p className="py-2 text-center text-xs text-slate-500 dark:text-slate-400">
                Anteprima delle prime 12 transazioni
              </p>
            )}
          </div>

          <Button
            type="button"
            onClick={confirmImport}
            disabled={importing || result.transactions.length === 0}
            className="h-12 w-full rounded-2xl"
          >
            {importing ? (
              <LoaderCircle className="h-5 w-5 animate-spin" />
            ) : (
              <Check className="h-5 w-5" />
            )}
            {importing ? "Importazione in corso" : "Importa su Supabase"}
          </Button>
        </>
      )}
    </div>
  );
}

function Summary({ label, value, warning = false }) {
  return (
    <div className="rounded-xl bg-slate-100/80 p-3 dark:bg-slate-900/65">
      <span className="block text-xs text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <strong className={warning ? "text-orange-500" : "text-slate-950 dark:text-white"}>
        {value}
      </strong>
    </div>
  );
}
