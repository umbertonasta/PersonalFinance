import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Cloud,
  Database,
  Download,
  Edit3,
  Inbox,
  Landmark,
  Link2,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  Upload,
  Wallet,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createTransaction,
  deleteTransaction,
  loadFinanceData,
  saveBudgets,
  updateTransaction,
  upsertMerchantRule,
} from "@/lib/financeDb";

/*
  ARCHITETTURA PRONTA PER SUPABASE E OPEN BANKING
  ------------------------------------------------
  Oggi l'app usa localStorage. Quando creerai Supabase, sostituiremo le funzioni
  di storageAdapter con query Supabase mantenendo invariata la UI.

  Tabelle previste:
  profiles: id, display_name, created_at
  accounts: id, user_id, name, institution, type, currency, external_id, status, last_sync_at
  transactions: id, user_id, account_id, type, amount, date, description,
    raw_description, normalized_merchant, category, suggested_category,
    confidence, review_status, source, external_id, bank_status, recurring, created_at
  merchant_rules: id, user_id, pattern, normalized_merchant, category, active
  budgets: id, user_id, category, monthly_limit
  sync_runs: id, user_id, account_id, provider, status, imported_count, started_at, ended_at

  Flusso futuro:
  Banca -> provider Open Banking -> funzione server sicura -> Supabase -> questa app.
  Mai inserire service_role key o segreti del provider nel frontend/repository.
*/

const euro = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});
const now = new Date();
const currentMonth = now.toISOString().slice(0, 7);
const today = () => new Date().toISOString().slice(0, 10);
const monthKey = (d) => d.slice(0, 7);
const labelMonth = (key) =>
  new Date(`${key}-01T12:00:00`).toLocaleDateString("it-IT", {
    month: "long",
    year: "numeric",
  });
const shiftMonth = (key, n) => {
  const d = new Date(`${key}-01T12:00:00`);
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 7);
};
const uid = () =>
  globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;

const CATEGORIES = [
  { name: "Casa", icon: "🏠", color: "#8b5cf6" },
  { name: "Alimentari", icon: "🛒", color: "#10b981" },
  { name: "Trasporti", icon: "🚗", color: "#3b82f6" },
  { name: "Tempo libero", icon: "🎉", color: "#f59e0b" },
  { name: "Shopping", icon: "🛍️", color: "#ec4899" },
  { name: "Salute", icon: "❤️", color: "#ef4444" },
  { name: "Formazione", icon: "📚", color: "#06b6d4" },
  { name: "Viaggi", icon: "✈️", color: "#14b8a6" },
  { name: "Abbonamenti", icon: "🔁", color: "#6366f1" },
  { name: "Investimenti", icon: "📈", color: "#0f766e" },
  { name: "Altro", icon: "📦", color: "#64748b" },
];
const cat = (name) =>
  CATEGORIES.find((c) => c.name === name) || {
    name: name || "Da classificare",
    icon: "❓",
    color: "#f97316",
  };

const seed = [
  {
    id: "d1",
    type: "income",
    amount: 1650,
    date: `${currentMonth}-02`,
    description: "Stipendio",
    raw_description: "BONIFICO STIPENDIO",
    normalized_merchant: "Datore di lavoro",
    category: "Stipendio",
    suggested_category: null,
    confidence: 1,
    review_status: "verified",
    source: "manual",
    external_id: null,
    bank_status: "booked",
    recurring: true,
  },
  {
    id: "d2",
    type: "expense",
    amount: 42.5,
    date: `${currentMonth}-05`,
    description: "Spesa settimanale",
    raw_description: "ESSELUNGA 0041 VARESE",
    normalized_merchant: "Esselunga",
    category: "Alimentari",
    suggested_category: null,
    confidence: 1,
    review_status: "verified",
    source: "bank",
    external_id: "demo-bank-1",
    bank_status: "booked",
    recurring: false,
  },
  {
    id: "d3",
    type: "expense",
    amount: 19.99,
    date: `${currentMonth}-08`,
    description: "Netflix",
    raw_description: "NETFLIX.COM 866-579-7172",
    normalized_merchant: "Netflix",
    category: "Abbonamenti",
    suggested_category: null,
    confidence: 1,
    review_status: "verified",
    source: "bank",
    external_id: "demo-bank-2",
    bank_status: "booked",
    recurring: true,
  },
  {
    id: "d4",
    type: "expense",
    amount: 18.5,
    date: `${currentMonth}-12`,
    description: "POS 847291 VARESE",
    raw_description: "PAGAMENTO POS 847291 VARESE",
    normalized_merchant: "",
    category: null,
    suggested_category: null,
    confidence: 0.12,
    review_status: "unclassified",
    source: "bank",
    external_id: "demo-bank-3",
    bank_status: "booked",
    recurring: false,
  },
  {
    id: "d5",
    type: "expense",
    amount: 27,
    date: `${currentMonth}-14`,
    description: "Amazon",
    raw_description: "AMZN MKTP IT*4H9L2",
    normalized_merchant: "Amazon",
    category: null,
    suggested_category: "Shopping",
    confidence: 0.64,
    review_status: "needs_review",
    source: "bank",
    external_id: "demo-bank-4",
    bank_status: "booked",
    recurring: false,
  },
];

const demoImports = [
  {
    type: "expense",
    amount: 35,
    date: today(),
    description: "ESSO STAZIONE 4821",
    raw_description: "PAGAMENTO CARTA ESSO STAZIONE 4821",
    normalized_merchant: "Esso",
    external_id: `mock-${Date.now()}-1`,
    bank_status: "booked",
  },
  {
    type: "expense",
    amount: 12,
    date: today(),
    description: "SUMUP *BAR CENTRALE",
    raw_description: "SUMUP *BAR CENTRALE VARESE",
    normalized_merchant: "Bar Centrale",
    external_id: `mock-${Date.now()}-2`,
    bank_status: "booked",
  },
  {
    type: "expense",
    amount: 7.99,
    date: today(),
    description: "PP*492047",
    raw_description: "PAGAMENTO PP*492047",
    normalized_merchant: "",
    external_id: `mock-${Date.now()}-3`,
    bank_status: "pending",
  },
];

const storageAdapter = {
  async load() {
    try {
      return JSON.parse(localStorage.getItem("finanze-v2")) || null;
    } catch {
      return null;
    }
  },
  async save(data) {
    localStorage.setItem("finanze-v2", JSON.stringify(data));
  },
  // Futuro: load/save chiameranno Supabase con session.user.id e Row Level Security.
};

function extractMerchantPattern(rawDescription) {
  return String(rawDescription || "")
    .toUpperCase()
    .replace(/^PAGAMENTO CARTA\s+/, "")
    .replace(/^PAGAMENTO POS\s+/, "")
    .replace(/^PAGAMENTO\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function classify(raw, rules) {
  const originalText = String(
    raw.raw_description || raw.description || "",
  ).toUpperCase();

  const personalRule = rules.find((rule) => {
    return rule.active && originalText.includes(rule.pattern.toUpperCase());
  });

  if (personalRule) {
    return {
      description: personalRule.normalized_merchant || raw.description,
      normalized_merchant: personalRule.normalized_merchant || "",
      category: personalRule.category,
      suggested_category: null,
      confidence: 1,
      review_status: "verified",
      rule_id: personalRule.id,
    };
  }

  const knownMerchants = [
    {
      pattern: "ESSELUNGA",
      merchant: "Esselunga",
      category: "Alimentari",
      confidence: 0.98,
    },
    {
      pattern: "LIDL",
      merchant: "Lidl",
      category: "Alimentari",
      confidence: 0.98,
    },
    {
      pattern: "NETFLIX",
      merchant: "Netflix",
      category: "Abbonamenti",
      confidence: 0.99,
    },
    {
      pattern: "SPOTIFY",
      merchant: "Spotify",
      category: "Abbonamenti",
      confidence: 0.99,
    },
    {
      pattern: "TRENORD",
      merchant: "Trenord",
      category: "Trasporti",
      confidence: 0.98,
    },
    {
      pattern: "ESSO",
      merchant: "Esso",
      category: "Trasporti",
      confidence: 0.96,
    },
    {
      pattern: "AMZN",
      merchant: "Amazon",
      category: "Shopping",
      confidence: 0.64,
    },
    {
      pattern: "AMAZON",
      merchant: "Amazon",
      category: "Shopping",
      confidence: 0.64,
    },
    {
      pattern: "BOOKING",
      merchant: "Booking",
      category: "Viaggi",
      confidence: 0.84,
    },
  ];

  const knownMerchant = knownMerchants.find((item) => {
    return originalText.includes(item.pattern);
  });

  if (!knownMerchant) {
    return {
      normalized_merchant: "",
      category: null,
      suggested_category: null,
      confidence: 0.1,
      review_status: "unclassified",
    };
  }

  if (knownMerchant.confidence >= 0.9) {
    return {
      description: knownMerchant.merchant,
      normalized_merchant: knownMerchant.merchant,
      category: knownMerchant.category,
      suggested_category: null,
      confidence: knownMerchant.confidence,
      review_status: "verified",
    };
  }

  return {
    description: knownMerchant.merchant,
    normalized_merchant: knownMerchant.merchant,
    category: null,
    suggested_category: knownMerchant.category,
    confidence: knownMerchant.confidence,
    review_status: "needs_review",
  };
}

function Modal({ open, onClose, children, wide = false }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            className={`max-h-[92vh] w-full overflow-auto rounded-t-[2rem] border border-slate-200 bg-white p-6 text-slate-950 shadow-2xl dark:border-white/10 dark:bg-slate-900 dark:text-slate-100 sm:rounded-[2rem] ${wide ? "max-w-3xl" : "max-w-xl"}`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function App() {
  const [databaseStatus, setDatabaseStatus] = useState("checking");
  const [databaseMessage, setDatabaseMessage] = useState(
    "Verifica del database in corso",
  );
  const [refreshing, setRefreshing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [savingMovement, setSavingMovement] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState({});
  const [savingBudgets, setSavingBudgets] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [toast, setToast] = useState(null);
  const [ready, setReady] = useState(false);
  const [transactions, setTransactions] = useState(seed);
  const [rules, setRules] = useState([
    {
      id: "r1",
      pattern: "ESSELUNGA",
      normalized_merchant: "Esselunga",
      category: "Alimentari",
      active: true,
    },
    {
      id: "r2",
      pattern: "NETFLIX",
      normalized_merchant: "Netflix",
      category: "Abbonamenti",
      active: true,
    },
  ]);
  const [accounts, setAccounts] = useState([
    {
      id: "a1",
      name: "Conto principale",
      institution: "Banca demo",
      type: "current",
      currency: "EUR",
      status: "demo",
      last_sync_at: null,
    },
  ]);
  const [budgets, setBudgets] = useState({
    Alimentari: 200,
    Trasporti: 100,
    "Tempo libero": 180,
    Shopping: 120,
  });
  const [month, setMonth] = useState(currentMonth);
  const [tab, setTab] = useState("dashboard");
  const [txModal, setTxModal] = useState(false);
  const [bankModal, setBankModal] = useState(false);
  const [reviewItem, setReviewItem] = useState(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    type: "expense",
    amount: "",
    date: today(),
    description: "",
    category: "Alimentari",
    recurring: false,
  });
  const [syncing, setSyncing] = useState(false);

  async function refreshCloudData(showFeedback = false) {
    setRefreshing(true);
    try {
      const cloudData = await loadFinanceData();
      setTransactions(cloudData.transactions);
      setRules(cloudData.rules);
      setBudgets(cloudData.budgets);
      setBudgetDraft(cloudData.budgets);
      if (cloudData.accounts.length > 0) setAccounts(cloudData.accounts);
      setDatabaseStatus("connected");
      setDatabaseMessage(
        `Database collegato. Transazioni cloud trovate: ${cloudData.transactions.length}`,
      );
      if (showFeedback)
        setToast({ type: "success", message: "Dati aggiornati dal cloud" });
    } catch (error) {
      console.error("Errore durante il caricamento cloud:", error);
      setDatabaseStatus("error");
      setDatabaseMessage(error.message || "Errore di connessione");
      setToast({
        type: "error",
        message: error.message || "Caricamento non riuscito",
      });
    } finally {
      setRefreshing(false);
      setReady(true);
    }
  }

  useEffect(() => {
    refreshCloudData();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const monthTx = useMemo(
    () => transactions.filter((t) => monthKey(t.date) === month),
    [transactions, month],
  );
  const income = monthTx
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + Number(t.amount), 0);
  const expenses = monthTx
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + Number(t.amount), 0);
  const balance = income - expenses;
  const pending = transactions.filter(
    (t) => t.type === "expense" && t.review_status !== "verified",
  );
  const monthPending = monthTx.filter(
    (t) => t.type === "expense" && t.review_status !== "verified",
  );
  const verifiedExpenses = monthTx.filter(
    (t) => t.type === "expense" && t.category,
  );
  const categoryData = useMemo(
    () =>
      Object.entries(
        verifiedExpenses.reduce((a, t) => {
          a[t.category] = (a[t.category] || 0) + Number(t.amount);
          return a;
        }, {}),
      )
        .map(([name, value]) => ({ name, value, ...cat(name) }))
        .concat(
          monthPending.length
            ? [
                {
                  name: "Da classificare",
                  value: monthPending.reduce((s, t) => s + Number(t.amount), 0),
                  color: "#f97316",
                  icon: "❓",
                },
              ]
            : [],
        )
        .sort((a, b) => b.value - a.value),
    [monthTx],
  );
  const trend = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5)).map(
        (key) => {
          const rows = transactions.filter((t) => monthKey(t.date) === key);
          return {
            name: new Date(`${key}-01`).toLocaleDateString("it-IT", {
              month: "short",
            }),
            Entrate: rows
              .filter((t) => t.type === "income")
              .reduce((s, t) => s + Number(t.amount), 0),
            Spese: rows
              .filter((t) => t.type === "expense")
              .reduce((s, t) => s + Number(t.amount), 0),
          };
        },
      ),
    [transactions, month],
  );
  const filtered = monthTx
    .filter((t) =>
      `${t.description} ${t.raw_description || ""} ${t.category || ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
    .sort((a, b) => b.date.localeCompare(a.date));

  function openNewMovement() {
    setEditingId(null);
    setForm({
      type: "expense",
      amount: "",
      date: today(),
      description: "",
      category: "Alimentari",
      recurring: false,
    });
    setTxModal(true);
  }

  function openEditMovement(transaction) {
    setEditingId(transaction.id);
    setForm({
      type: transaction.type,
      amount: String(transaction.amount),
      date: transaction.date,
      description: transaction.description,
      category:
        transaction.category ||
        (transaction.type === "income" ? "Stipendio" : "Altro"),
      recurring: Boolean(transaction.recurring),
    });
    setTxModal(true);
  }

  async function saveManual() {
    const amount = Number(String(form.amount).replace(",", "."));
    if (!amount || amount <= 0 || !form.date || !form.description.trim()) {
      setToast({
        type: "error",
        message: "Compila importo, descrizione e data",
      });
      return;
    }
    setSavingMovement(true);
    try {
      if (editingId) {
        const updated = await updateTransaction(editingId, {
          type: form.type,
          amount,
          date: form.date,
          description: form.description.trim(),
          normalized_merchant: form.description.trim(),
          category: form.category,
          recurring: form.recurring,
        });
        setTransactions((previous) =>
          previous.map((item) => (item.id === updated.id ? updated : item)),
        );
        setToast({ type: "success", message: "Movimento modificato" });
      } else {
        const created = await createTransaction({
          ...form,
          amount,
          description: form.description.trim(),
          raw_description: form.description.trim(),
          normalized_merchant: form.description.trim(),
          review_status: "verified",
          suggested_category: null,
          confidence: 1,
          source: "manual",
          external_id: null,
          bank_status: "booked",
        });
        setTransactions((previous) => [created, ...previous]);
        setToast({ type: "success", message: "Movimento aggiunto" });
      }
      setTxModal(false);
      setEditingId(null);
    } catch (error) {
      setToast({
        type: "error",
        message: error.message || "Salvataggio non riuscito",
      });
    } finally {
      setSavingMovement(false);
    }
  }

  async function assignCategory(transaction, category, remember, merchantName) {
    const readableMerchant = merchantName.trim();
    const recognitionPattern = extractMerchantPattern(
      transaction.raw_description || transaction.description,
    );
    try {
      const updated = await updateTransaction(transaction.id, {
        description: readableMerchant || transaction.description,
        normalized_merchant:
          readableMerchant || transaction.normalized_merchant,
        category,
        suggested_category: null,
        confidence: 1,
        review_status: "verified",
      });
      setTransactions((previous) =>
        previous.map((item) => (item.id === updated.id ? updated : item)),
      );
      if (
        remember &&
        readableMerchant.length >= 3 &&
        recognitionPattern.length >= 3
      ) {
        const savedRule = await upsertMerchantRule({
          pattern: recognitionPattern,
          normalized_merchant: readableMerchant,
          category,
          active: true,
        });
        setRules((previous) =>
          previous.some(
            (rule) => rule.pattern.toUpperCase() === recognitionPattern,
          )
            ? previous.map((rule) =>
                rule.pattern.toUpperCase() === recognitionPattern
                  ? savedRule
                  : rule,
              )
            : [...previous, savedRule],
        );
      }
      setReviewItem(null);
      setToast({ type: "success", message: "Transazione classificata" });
    } catch (error) {
      setToast({
        type: "error",
        message: error.message || "Classificazione non riuscita",
      });
    }
  }

  async function syncDemo() {
    setSyncing(true);
    try {
      const ids = new Set(
        transactions.map((item) => item.external_id).filter(Boolean),
      );
      const createdItems = [];
      for (const raw of demoImports.filter(
        (item) => !ids.has(item.external_id),
      )) {
        createdItems.push(
          await createTransaction({
            recurring: false,
            source: "bank",
            ...raw,
            ...classify(raw, rules),
          }),
        );
      }
      setTransactions((previous) => [...createdItems, ...previous]);
      setBankModal(false);
      setTab("inbox");
      setToast({
        type: "success",
        message: `${createdItems.length} movimenti demo importati`,
      });
    } catch (error) {
      setToast({
        type: "error",
        message: error.message || "Sincronizzazione non riuscita",
      });
    } finally {
      setSyncing(false);
    }
  }

  function requestDelete(transaction) {
    setConfirmDialog({
      title: "Eliminare il movimento?",
      message: `${transaction.description} · ${euro.format(transaction.amount)}`,
      detail:
        "Il movimento verrà eliminato anche da Supabase e dagli altri dispositivi.",
      confirmLabel: "Elimina movimento",
      danger: true,
      action: async () => {
        await deleteTransaction(transaction.id);
        setTransactions((previous) =>
          previous.filter((item) => item.id !== transaction.id),
        );
        setToast({ type: "success", message: "Movimento eliminato" });
      },
    });
  }

  async function runConfirmedAction() {
    if (!confirmDialog?.action) return;
    const action = confirmDialog.action;
    setConfirmDialog((current) => ({ ...current, loading: true }));
    try {
      await action();
      setConfirmDialog(null);
    } catch (error) {
      setConfirmDialog(null);
      setToast({
        type: "error",
        message: error.message || "Operazione non riuscita",
      });
    }
  }

  async function saveBudgetChanges() {
    setSavingBudgets(true);
    try {
      const saved = await saveBudgets(budgetDraft);
      setBudgets(saved);
      setBudgetDraft(saved);
      setToast({ type: "success", message: "Budget salvati su Supabase" });
    } catch (error) {
      setToast({
        type: "error",
        message: error.message || "Salvataggio budget non riuscito",
      });
    } finally {
      setSavingBudgets(false);
    }
  }

  function exportBackup() {
    const blob = new Blob(
      [
        JSON.stringify(
          { version: 2, transactions, rules, accounts, budgets },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u;
    a.download = `finanze-v2-${today()}.json`;
    a.click();
    URL.revokeObjectURL(u);
  }

  if (!ready)
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 text-white">
        <RefreshCw className="animate-spin" />
      </div>
    );
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12)_0,_transparent_28%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.10)_0,_transparent_24%),linear-gradient(to_bottom,_#f8fafc,_#eef2f7)] pb-24 text-slate-950 transition-colors duration-300 dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16)_0,_transparent_28%),radial-gradient(circle_at_top_right,_rgba(52,211,153,0.11)_0,_transparent_25%),linear-gradient(to_bottom,_#070b14,_#0b1220)] dark:text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-4 rounded-[1.75rem] border border-white/70 bg-white/70 p-4 shadow-lg shadow-slate-900/5 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/65 dark:shadow-black/20">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-600/20 dark:from-emerald-400 dark:to-cyan-500 dark:text-slate-950 dark:shadow-emerald-500/20">
              <Landmark />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                Il mio patrimonio
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Chiarezza oggi, libertà domani.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="rounded-2xl bg-white/70"
              onClick={() => refreshCloudData(true)}
              disabled={refreshing}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Aggiorna
            </Button>
            <Button
              variant="outline"
              className="rounded-2xl bg-white/70"
              onClick={() => setBankModal(true)}
            >
              <Link2 className="mr-2 h-4 w-4" />
              Conti
            </Button>
            <Button
              className="rounded-2xl bg-slate-950"
              onClick={openNewMovement}
            >
              <Plus className="mr-2 h-4 w-4" />
              Movimento
            </Button>
          </div>
        </header>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap rounded-2xl bg-white/70 p-1 shadow-sm">
            {[
              ["dashboard", "Panoramica", Wallet],
              [
                "inbox",
                `Da classificare${pending.length ? ` (${pending.length})` : ""}`,
                Inbox,
              ],
              ["movements", "Movimenti", BarChart3],
              ["settings", "Sistema", Settings2],
            ].map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${tab === id ? "bg-slate-950 text-white shadow" : "text-slate-500"}`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center rounded-2xl bg-white/70 p-1 shadow-sm">
            <button
              className="p-2"
              onClick={() => setMonth(shiftMonth(month, -1))}
            >
              <ChevronLeft size={18} />
            </button>
            <b className="min-w-40 text-center capitalize">
              {labelMonth(month)}
            </b>
            <button
              className="p-2"
              onClick={() => setMonth(shiftMonth(month, 1))}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {tab === "dashboard" && (
          <motion.main
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                title="Entrate"
                value={euro.format(income)}
                icon={ArrowUpRight}
                color="emerald"
              />
              <Stat
                title="Spese"
                value={euro.format(expenses)}
                icon={ArrowDownRight}
                color="rose"
              />
              <Stat
                title="Risparmio"
                value={euro.format(balance)}
                icon={Wallet}
                color="blue"
              />
              <Stat
                title="Da classificare"
                value={euro.format(
                  monthPending.reduce((s, t) => s + Number(t.amount), 0),
                )}
                subtitle={`${monthPending.length} operazioni`}
                icon={Inbox}
                color="orange"
                action={() => setTab("inbox")}
              />
            </section>
            <section className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_.8fr]">
              <Panel title="Ultimi 6 mesi" subtitle="Entrate e spese">
                <div className="h-72">
                  <ResponsiveContainer>
                    <AreaChart data={trend}>
                      <CartesianGrid
                        vertical={false}
                        strokeDasharray="3 3"
                        opacity={0.15}
                      />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip
                        formatter={(v) => euro.format(v)}
                        contentStyle={{ borderRadius: 16, border: "none" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="Entrate"
                        stroke="#10b981"
                        fill="#10b98120"
                        strokeWidth={3}
                      />
                      <Area
                        type="monotone"
                        dataKey="Spese"
                        stroke="#f43f5e"
                        fill="#f43f5e18"
                        strokeWidth={3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
              <Panel title="Dove spendi" subtitle="Il limbo resta separato">
                <div className="h-48">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        dataKey="value"
                        innerRadius={50}
                        outerRadius={78}
                        paddingAngle={3}
                      >
                        {categoryData.map((x) => (
                          <Cell key={x.name} fill={x.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => euro.format(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {categoryData.slice(0, 5).map((x) => (
                    <div key={x.name} className="flex justify-between text-sm">
                      <span>
                        {x.icon} {x.name}
                      </span>
                      <b>{euro.format(x.value)}</b>
                    </div>
                  ))}
                </div>
              </Panel>
            </section>
            {pending.length > 0 && (
              <button
                onClick={() => setTab("inbox")}
                className="mt-4 flex w-full items-center justify-between rounded-3xl bg-gradient-to-r from-orange-500 to-amber-400 p-5 text-left text-white shadow-lg"
              >
                <span>
                  <span className="block text-xs font-bold uppercase opacity-80">
                    Richiede attenzione
                  </span>
                  <b className="text-lg">
                    Hai {pending.length} transazioni da classificare
                  </b>
                </span>
                <Inbox />
              </button>
            )}
          </motion.main>
        )}

        {tab === "inbox" && (
          <motion.main
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Panel
              title="Da classificare"
              subtitle="Nessuna categoria viene assegnata senza sufficiente certezza"
            >
              <div className="mb-5 rounded-2xl bg-orange-50 p-4 text-sm text-orange-900">
                <b>Come funziona:</b> le spese dubbie sono già incluse nel
                totale mensile, ma restano separate nei grafici finché non le
                confermi.
              </div>
              {pending.length ? (
                <div className="space-y-3">
                  {pending.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setReviewItem(t)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-orange-100 bg-white p-4 text-left shadow-sm hover:border-orange-300"
                    >
                      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-100 text-xl">
                        ❓
                      </div>
                      <div className="min-w-0 flex-1">
                        <b className="block truncate">{t.description}</b>
                        <span className="text-xs text-slate-400">
                          {new Date(`${t.date}T12:00:00`).toLocaleDateString(
                            "it-IT",
                          )}{" "}
                          ·{" "}
                          {t.source === "bank"
                            ? "Importata dalla banca"
                            : "Manuale"}
                        </span>
                        {t.suggested_category && (
                          <span className="mt-1 block text-xs font-bold text-orange-600">
                            Suggerimento: {t.suggested_category} · confidenza{" "}
                            {Math.round(t.confidence * 100)}%
                          </span>
                        )}
                      </div>
                      <b className="text-rose-600">−{euro.format(t.amount)}</b>
                      <ChevronRight size={18} className="text-slate-300" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center">
                  <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600">
                    <Check size={30} />
                  </div>
                  <h3 className="text-xl font-black">Tutto in ordine</h3>
                  <p className="text-slate-400">
                    Non ci sono transazioni in attesa.
                  </p>
                </div>
              )}
            </Panel>
          </motion.main>
        )}

        {tab === "movements" && (
          <motion.main
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Panel title="Movimenti" subtitle="Manuali e importati">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  className="rounded-xl pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cerca..."
                />
              </div>
              <div className="space-y-2">
                {filtered.map((t) => (
                  <TxRow
                    key={t.id}
                    t={t}
                    onReview={() => setReviewItem(t)}
                    onEdit={() => openEditMovement(t)}
                    onDelete={() => requestDelete(t)}
                  />
                ))}
              </div>
            </Panel>
          </motion.main>
        )}

        {tab === "settings" && (
          <motion.main
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-4 lg:grid-cols-3"
          >
            <SystemCard
              icon={Database}
              title="Supabase"
              status={
                databaseStatus === "checking"
                  ? "Verifica in corso"
                  : databaseStatus === "connected"
                    ? "Collegato"
                    : "Errore"
              }
              text={databaseMessage}
            />

            <SystemCard
              icon={Building2}
              title="Open Banking"
              status="Modalità demo"
              text="Il pulsante di sincronizzazione simula l'importazione senza accedere a dati reali."
            />
            <SystemCard
              icon={ShieldCheck}
              title="Regole personali"
              status={`${rules.length} attive`}
              text="Gli esercenti già confermati vengono classificati automaticamente."
            />
            <Panel
              title="Regole di classificazione"
              subtitle="Create dalle tue conferme"
            >
              <div className="space-y-2">
                {rules.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-xl bg-slate-50 p-3"
                  >
                    <span>
                      <b>{r.normalized_merchant}</b>
                      <small className="block text-slate-400">
                        contiene “{r.pattern}”
                      </small>
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-sm font-bold">
                      {cat(r.category).icon} {r.category}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel
              title="Budget mensili"
              subtitle="Imposta i limiti e salvali nel cloud"
            >
              <div className="space-y-3">
                {CATEGORIES.filter((item) => item.name !== "Altro").map(
                  (item) => (
                    <label key={item.name} className="flex items-center gap-3">
                      <span className="min-w-32 text-sm font-bold">
                        {item.icon} {item.name}
                      </span>
                      <Input
                        type="number"
                        min="0"
                        value={budgetDraft[item.name] ?? ""}
                        onChange={(event) =>
                          setBudgetDraft((current) => ({
                            ...current,
                            [item.name]: event.target.value,
                          }))
                        }
                        placeholder="Nessun limite"
                        className="rounded-xl"
                      />
                    </label>
                  ),
                )}
                <Button
                  className="mt-2 h-11 w-full rounded-xl bg-slate-950"
                  onClick={saveBudgetChanges}
                  disabled={savingBudgets}
                >
                  {savingBudgets ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  {savingBudgets ? "Salvataggio" : "Salva budget"}
                </Button>
              </div>
            </Panel>
            <Panel
              title="Backup"
              subtitle="Continua a proteggere i dati locali"
            >
              <Button
                variant="outline"
                className="w-full rounded-xl"
                onClick={exportBackup}
              >
                <Download className="mr-2 h-4 w-4" />
                Scarica backup JSON
              </Button>
            </Panel>
            <Panel
              title="Stato connessione"
              subtitle="Nessun dato bancario reale"
            >
              <div className="space-y-3 text-sm">
                <p>
                  Account demo: <b>{accounts[0]?.name}</b>
                </p>
                <p>
                  Ultima sincronizzazione:{" "}
                  <b>
                    {accounts[0]?.last_sync_at
                      ? new Date(accounts[0].last_sync_at).toLocaleString(
                          "it-IT",
                        )
                      : "Mai"}
                  </b>
                </p>
                <Button
                  className="w-full rounded-xl bg-slate-950"
                  onClick={() => setBankModal(true)}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Apri connessione demo
                </Button>
              </div>
            </Panel>
          </motion.main>
        )}
      </div>

      <Modal open={txModal} onClose={() => setTxModal(false)}>
        <ModalHead
          title={editingId ? "Modifica movimento" : "Nuovo movimento"}
          close={() => {
            setTxModal(false);
            setEditingId(null);
          }}
        />
        <div className="space-y-4">
          <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
            {[
              ["expense", "Spesa"],
              ["income", "Entrata"],
            ].map(([v, l]) => (
              <button
                key={v}
                onClick={() =>
                  setForm({
                    ...form,
                    type: v,
                    category: v === "income" ? "Stipendio" : "Alimentari",
                  })
                }
                className={`rounded-lg py-2 font-bold ${form.type === v ? "bg-slate-950 text-white" : ""}`}
              >
                {l}
              </button>
            ))}
          </div>
          <Input
            inputMode="decimal"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="Importo in euro"
            className="h-12 rounded-xl"
          />
          <Input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Descrizione"
            className="h-12 rounded-xl"
          />
          <Input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="h-12 rounded-xl"
          />
          {form.type === "expense" && (
            <select
              className="h-12 w-full rounded-xl border px-3"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.map((c) => (
                <option key={c.name}>{c.name}</option>
              ))}
            </select>
          )}
          <Button
            className="h-12 w-full rounded-xl bg-slate-950"
            onClick={saveManual}
            disabled={savingMovement}
          >
            {savingMovement
              ? "Salvataggio"
              : editingId
                ? "Salva modifiche"
                : "Aggiungi"}
          </Button>
        </div>
      </Modal>

      <Modal open={bankModal} onClose={() => setBankModal(false)}>
        <ModalHead
          title="Collegamento conto"
          close={() => setBankModal(false)}
        />
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <ShieldCheck className="mb-2" />
          <b>Questa è una simulazione.</b>
          <p className="mt-1">
            Non vengono richiesti dati bancari e non viene effettuato alcun
            collegamento reale. Serve per provare importazione, limbo,
            suggerimenti e regole personali.
          </p>
        </div>
        <div className="my-5 rounded-2xl border p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100">
              <Building2 />
            </div>
            <div>
              <b>Conto principale · Demo</b>
              <p className="text-xs text-slate-400">
                3 nuovi movimenti simulati
              </p>
            </div>
          </div>
        </div>
        <Button
          disabled={syncing}
          className="h-12 w-full rounded-xl bg-slate-950"
          onClick={syncDemo}
        >
          {syncing ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Cloud className="mr-2 h-4 w-4" />
          )}
          {syncing ? "Sincronizzazione..." : "Simula sincronizzazione"}
        </Button>
        <p className="mt-3 text-center text-xs text-slate-400">
          Il collegamento reale verrà attivato solo dopo Supabase e backend
          sicuro.
        </p>
      </Modal>

      <Modal open={!!reviewItem} onClose={() => setReviewItem(null)}>
        <ModalHead
          title="Classifica transazione"
          close={() => setReviewItem(null)}
        />
        {reviewItem && <Review tx={reviewItem} onPick={assignCategory} />}
      </Modal>
      <Modal
        open={!!confirmDialog}
        onClose={() => !confirmDialog?.loading && setConfirmDialog(null)}
      >
        {confirmDialog && (
          <div>
            <div
              className={`mb-5 inline-flex rounded-2xl p-3 ${confirmDialog.danger ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"}`}
            >
              <Trash2 />
            </div>
            <h2 className="text-2xl font-black">{confirmDialog.title}</h2>
            <p className="mt-3 font-bold text-slate-700">
              {confirmDialog.message}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {confirmDialog.detail}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-11 rounded-xl"
                onClick={() => setConfirmDialog(null)}
                disabled={confirmDialog.loading}
              >
                Annulla
              </Button>
              <Button
                className={`h-11 rounded-xl ${confirmDialog.danger ? "bg-rose-600 hover:bg-rose-700" : "bg-slate-950"}`}
                onClick={runConfirmedAction}
                disabled={confirmDialog.loading}
              >
                {confirmDialog.loading ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {confirmDialog.confirmLabel}
              </Button>
            </div>
          </div>
        )}
      </Modal>
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-2xl ${toast.type === "error" ? "bg-rose-600" : "bg-emerald-600"}`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Review({ tx, onPick }) {
  const [selectedCategory, setSelectedCategory] = useState(
    tx.suggested_category || "",
  );

  const [merchantName, setMerchantName] = useState(
    tx.normalized_merchant || "",
  );

  const [remember, setRemember] = useState(Boolean(tx.normalized_merchant));

  const recognitionPattern = extractMerchantPattern(
    tx.raw_description || tx.description,
  );

  const canRemember =
    merchantName.trim().length >= 3 && recognitionPattern.length >= 3;

  function confirmClassification() {
    if (!selectedCategory) {
      return;
    }

    onPick(tx, selectedCategory, canRemember && remember, merchantName);
  }

  return (
    <>
      <div className="rounded-2xl bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">Importo</span>

          <b className="text-xl text-rose-600">−{euro.format(tx.amount)}</b>
        </div>

        <div className="mt-4">
          <span className="text-sm font-bold">
            Descrizione bancaria originale
          </span>

          <p className="mt-1 break-all text-sm text-slate-700">
            {tx.raw_description}
          </p>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Testo che verrà riconosciuto
          </span>

          <p className="mt-1 break-all text-sm font-bold text-slate-900">
            {recognitionPattern || "Nessun testo riconoscibile"}
          </p>
        </div>

        {tx.suggested_category && (
          <div className="mt-3 rounded-xl bg-orange-100 p-3 text-sm text-orange-900">
            Categoria suggerita: <b>{tx.suggested_category}</b>
            <br />
            Affidabilità del suggerimento:{" "}
            <b>{Math.round(tx.confidence * 100)}%</b>
          </div>
        )}
      </div>

      <h3 className="mb-3 mt-5 font-black">Scegli la categoria</h3>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {CATEGORIES.map((category) => {
          const isSelected = selectedCategory === category.name;

          return (
            <button
              type="button"
              key={category.name}
              onClick={() => {
                setSelectedCategory(category.name);
              }}
              className={`rounded-xl border p-3 text-left text-sm font-bold transition ${
                isSelected
                  ? "border-slate-950 bg-slate-950 text-white shadow-md"
                  : "border-slate-200 bg-white hover:border-slate-500"
              }`}
            >
              <span className="mr-2 text-lg">{category.icon}</span>

              {category.name}
            </button>
          );
        })}
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
        <label className="block">
          <span className="block text-sm font-bold">
            Nome leggibile dell&apos;esercente
          </span>

          <span className="mt-1 block text-xs text-slate-400">
            Questo nome verrà mostrato nel sito al posto della descrizione
            bancaria.
          </span>

          <Input
            value={merchantName}
            onChange={(event) => {
              const value = event.target.value;

              setMerchantName(value);

              if (value.trim().length < 3) {
                setRemember(false);
              }
            }}
            placeholder="Es. Bar Centrale"
            className="mt-3 h-11 rounded-xl"
          />
        </label>
      </div>

      {canRemember ? (
        <label className="mt-3 flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <span>
            <b className="block text-sm text-blue-950">Ricorda per il futuro</b>

            <small className="mt-1 block text-blue-700">
              Quando la descrizione bancaria contiene{" "}
              <b>{recognitionPattern}</b>, mostra <b>{merchantName.trim()}</b> e
              classifica il pagamento come{" "}
              <b>{selectedCategory || "categoria selezionata"}</b>.
            </small>
          </span>

          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => {
              setRemember(event.target.checked);
            }}
            className="h-5 w-5 shrink-0 accent-blue-700"
          />
        </label>
      ) : (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <b>Classificazione valida solo per questa transazione.</b>

          <p className="mt-1">
            Inserisci un nome leggibile dell&apos;esercente per abilitare la
            memorizzazione.
          </p>
        </div>
      )}

      <Button
        type="button"
        disabled={!selectedCategory}
        onClick={confirmClassification}
        className="mt-5 h-12 w-full rounded-xl bg-slate-950"
      >
        <Check className="mr-2 h-4 w-4" />

        {selectedCategory
          ? `Conferma come ${selectedCategory}`
          : "Seleziona una categoria"}
      </Button>
    </>
  );
}
function Stat({ title, value, subtitle, icon: Icon, color, action }) {
  const map = {
    emerald: "bg-emerald-100 text-emerald-700",
    rose: "bg-rose-100 text-rose-700",
    blue: "bg-blue-100 text-blue-700",
    orange: "bg-orange-100 text-orange-700",
  };
  return (
    <motion.button
      whileHover={{ y: -3 }}
      onClick={action}
      className="rounded-[1.75rem] border border-white/70 bg-white/80 p-5 text-left shadow-sm shadow-slate-900/5 backdrop-blur-xl transition-all hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-slate-900/80 dark:shadow-black/20"
    >
      <div className={`mb-4 inline-flex rounded-2xl p-3 ${map[color]}`}>
        <Icon size={20} />
      </div>
      <div className="text-sm text-slate-500">{title}</div>
      <div className="text-2x1 font-black text-slate-950 dark:text-white">
        {value}
      </div>
      {subtitle && <div className="text-xs text-slate-400">{subtitle}</div>}
    </motion.button>
  );
}
function Panel({ title, subtitle, children }) {
  return (
    <Card className="rounded-[1.75rem] border border-white/70 bg-white/80 shadow-sm shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 dark:shadow-black/20">
      <CardContent className="p-5 sm:p-6">
        <h2 className="text-lg font-black">{title}</h2>
        <p className="mb-5 text-sm text-slate-400">{subtitle}</p>
        {children}
      </CardContent>
    </Card>
  );
}
function TxRow({ t, onReview, onEdit, onDelete }) {
  const c = t.category ? cat(t.category) : { icon: "❓", color: "#f97316" };
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-transparent bg-slate-50/80 p-3 transition hover:border-slate-200 hover:bg-white dark:bg-slate-800/55 dark:hover:border-slate-700 dark:hover:bg-slate-800">
      <div
        className="grid h-11 w-11 place-items-center rounded-xl text-xl"
        style={{ background: `${c.color}18` }}
      >
        {c.icon}
      </div>
      <div className="min-w-0 flex-1">
        <b className="block truncate">{t.description}</b>
        <span className="text-xs text-slate-400">
          {t.category || "Da classificare"} ·{" "}
          {t.source === "bank" ? "Banca" : "Manuale"} ·{" "}
          {t.bank_status === "pending" ? "In sospeso" : "Contabilizzata"}
        </span>
      </div>
      <b className={t.type === "income" ? "text-emerald-600" : "text-rose-600"}>
        {t.type === "income" ? "+" : "−"}
        {euro.format(t.amount)}
      </b>
      <button
        onClick={onEdit}
        className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
        title="Modifica"
      >
        <Edit3 size={16} />
      </button>
      {t.review_status !== "verified" && (
        <button
          onClick={onReview}
          className="rounded-lg bg-orange-100 p-2 text-orange-700"
        >
          <CircleHelp size={16} />
        </button>
      )}
      <button
        onClick={onDelete}
        className="rounded-lg p-2 text-slate-300 hover:text-rose-600"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
function SystemCard({ icon: Icon, title, status, text }) {
  return (
    <Card className="rounded-3xl border-white/70 bg-white/80 shadow-sm">
      <CardContent className="p-6">
        <div className="mb-4 inline-flex rounded-2xl bg-blue-100 p-3 text-blue-700">
          <Icon />
        </div>
        <h3 className="font-black">{title}</h3>
        <span className="mt-2 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">
          {status}
        </span>
        <p className="mt-3 text-sm leading-relaxed text-slate-500">{text}</p>
      </CardContent>
    </Card>
  );
}
function ModalHead({ title, close }) {
  return (
    <div className="mb-5 flex items-center justify-between">
      <h2 className="text-2xl font-black">{title}</h2>
      <button className="rounded-xl bg-slate-100 p-2" onClick={close}>
        <X size={18} />
      </button>
    </div>
  );
}
export default App;
