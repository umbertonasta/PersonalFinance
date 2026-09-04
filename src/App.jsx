import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
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
  deleteMerchantRule,
  loadFinanceData,
  saveBudgets,
  setTransactionTags,
  updateMerchantRule,
  updateTransaction,
  upsertMerchantRule,
} from "@/lib/financeDb";
import CsvImporter from "@/components/CsvImporter";
import { importCsvTransactions } from "@/lib/csvFinanceDb";
import TaxonomyManager from "@/components/taxonomy/TaxonomyManager";
import { loadTaxonomy } from "@/lib/taxonomyDb";
import TransactionDetailsEditor from "@/components/transactions/TransactionDetailsEditor";
import OverviewDashboard from "@/components/dashboard/OverviewDashboard";

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

function needsClassification(transaction) {
  return (
    Boolean(transaction) &&
    (transaction.review_status !== "verified" || !transaction.category_id)
  );
}

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

  if (/KLARNA/i.test(originalText)) {
    return {
      normalized_merchant:
        raw.normalized_merchant || raw.description || "Klarna",
      category: null,
      category_id: null,
      subcategory_id: null,
      microcategory_id: null,
      suggested_category: null,
      confidence: 0,
      review_status: "needs_review",
    };
  }
  const personalRule = rules.find((rule) => {
    return rule.active && originalText.includes(rule.pattern.toUpperCase());
  });

  if (personalRule) {
    return {
      description: personalRule.normalized_merchant || raw.description,
      normalized_merchant: personalRule.normalized_merchant || "",
      category: personalRule.category,
      category_id: personalRule.category_id || null,
      subcategory_id: personalRule.subcategory_id || null,
      microcategory_id: personalRule.remember_microcategory
        ? personalRule.microcategory_id || null
        : null,
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
  const [newBudgetName, setNewBudgetName] = useState("");
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
  const [showAllRules, setShowAllRules] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [savingRule, setSavingRule] = useState(false);
  const [ruleTaxonomy, setRuleTaxonomy] = useState({
    categories: [],
    subcategories: [],
    microcategories: [],
  });
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
  const [csvModal, setCsvModal] = useState(false);
  const [reviewItem, setReviewItem] = useState(null);
  const [selectedPendingIds, setSelectedPendingIds] = useState([]);
  const [bulkClassification, setBulkClassification] = useState(null);
  const [savingBulk, setSavingBulk] = useState(false);
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

  useEffect(() => {
    setSelectedPendingIds([]);
  }, [month, tab]);

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
  const pending = transactions.filter(needsClassification);
  const monthPending = monthTx.filter(needsClassification);
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

  function addCustomBudget() {
    const name = newBudgetName.trim().replace(/\s+/g, " ");
    if (!name) {
      setToast({ type: "error", message: "Inserisci il nome della voce" });
      return;
    }
    const existingName = Object.keys(budgetDraft).find(
      (item) => item.toLocaleLowerCase("it-IT") === name.toLocaleLowerCase("it-IT"),
    );
    if (existingName) {
      setToast({ type: "error", message: "Questa voce esiste già" });
      return;
    }
    setBudgetDraft((current) => ({ ...current, [name]: "" }));
    setNewBudgetName("");
  }

  function removeCustomBudget(name) {
    setBudgetDraft((current) =>
      Object.fromEntries(Object.entries(current).filter(([key]) => key !== name)),
    );
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

  async function openBulkClassification() {
    if (selectedPendingIds.length < 2) return;
    try {
      const taxonomy = await loadTaxonomy({ includeHidden: false });
      setRuleTaxonomy(taxonomy);
      setBulkClassification({
        categoryId: "",
        subcategoryId: "",
        microcategoryId: "",
      });
    } catch (error) {
      setToast({
        type: "error",
        message: error.message || "Impossibile caricare le categorie",
      });
    }
  }

  async function saveBulkClassification() {
    if (!bulkClassification?.categoryId) return;
    const category = ruleTaxonomy.categories.find(
      (item) => item.id === bulkClassification.categoryId,
    );
    if (!category) return;
    setSavingBulk(true);
    try {
      const selectedSet = new Set(selectedPendingIds);
      const rows = transactions.filter((item) => selectedSet.has(item.id));
      const results = await Promise.all(
        rows.map((item) =>
          updateTransaction(item.id, {
            category: category.name,
            categoryId: category.id,
            subcategoryId: bulkClassification.subcategoryId || null,
            microcategoryId: bulkClassification.microcategoryId || null,
            suggested_category: null,
            confidence: 1,
            review_status: "verified",
          }),
        ),
      );
      const updated = new Map(results.map((item) => [item.id, item]));
      setTransactions((current) =>
        current.map((item) => updated.get(item.id) || item),
      );
      setSelectedPendingIds([]);
      setBulkClassification(null);
      setToast({
        type: "success",
        message: `${results.length} movimenti classificati insieme`,
      });
    } catch (error) {
      setToast({
        type: "error",
        message: error.message || "Classificazione multipla non riuscita",
      });
    } finally {
      setSavingBulk(false);
    }
  }

  async function saveDetailedMovement(details) {
    setSavingMovement(true);
    try {
      const baseChanges = {
        type: details.type,
        amount: details.amount,
        date: details.date,
        description: details.description,
        normalized_merchant: details.description,
        category: details.category,
        categoryId: details.categoryId,
        subcategoryId: details.subcategoryId || null,
        microcategoryId: details.microcategoryId || null,
        notes: details.notes || null,
        recurring: details.recurring,
      };

      if (editingId) {
        const updated = await updateTransaction(editingId, baseChanges);
        const tagIds = await setTransactionTags(editingId, details.tagIds);
        setTransactions((previous) =>
          previous.map((item) =>
            item.id === updated.id ? { ...updated, tag_ids: tagIds } : item,
          ),
        );
        setToast({
          type: "success",
          message: "Movimento aggiornato con tutti i dettagli",
        });
      } else {
        const created = await createTransaction({
          ...baseChanges,
          raw_description: details.description,
          review_status: "verified",
          confidence: 1,
          source: "manual",
          bank_status: "booked",
        });
        const tagIds = await setTransactionTags(created.id, details.tagIds);
        setTransactions((previous) => [
          { ...created, tag_ids: tagIds },
          ...previous,
        ]);
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

  async function saveDetailedReview(details) {
    if (!reviewItem) return;
    setSavingMovement(true);
    try {
      const updated = await updateTransaction(reviewItem.id, {
        type: details.type,
        amount: details.amount,
        date: details.date,
        description: details.description,
        normalized_merchant: details.description,
        category: details.category,
        categoryId: details.categoryId,
        subcategoryId: details.subcategoryId || null,
        microcategoryId: details.microcategoryId || null,
        notes: details.notes || null,
        suggested_category: null,
        confidence: 1,
        review_status: "verified",
      });
      const tagIds = await setTransactionTags(reviewItem.id, details.tagIds);
      const complete = { ...updated, tag_ids: tagIds };
      setTransactions((previous) =>
        previous.map((item) => (item.id === complete.id ? complete : item)),
      );

      const pattern = extractMerchantPattern(
        reviewItem.raw_description || reviewItem.description,
      );
      if (
        details.remember &&
        pattern.length >= 3 &&
        details.description.length >= 3
      ) {
        const savedRule = await upsertMerchantRule({
          pattern,
          normalized_merchant: details.description,
          category: details.category,
          categoryId: details.categoryId,
          subcategoryId: details.subcategoryId || null,
          microcategoryId: details.microcategoryId || null,
          rememberMicrocategory: details.rememberMicrocategory,
          active: true,
        });
        setRules((previous) => {
          const found = previous.some(
            (rule) => rule.pattern.toUpperCase() === pattern,
          );
          return found
            ? previous.map((rule) =>
                rule.pattern.toUpperCase() === pattern ? savedRule : rule,
              )
            : [...previous, savedRule];
        });
      }

      setReviewItem(null);
      setToast({
        type: "success",
        message: "Transazione classificata in dettaglio",
      });
    } catch (error) {
      setToast({
        type: "error",
        message: error.message || "Classificazione non riuscita",
      });
    } finally {
      setSavingMovement(false);
    }
  }

  async function handleCsvImport(csvTransactions) {
    const result = await importCsvTransactions(csvTransactions);

    if (result.inserted.length > 0) {
      setTransactions((previousTransactions) => {
        const combined = [...result.inserted, ...previousTransactions];

        return combined.sort((first, second) => {
          return second.date.localeCompare(first.date);
        });
      });
    }

    setCsvModal(false);

    if (result.insertedCount === 0) {
      setToast({
        type: "success",
        message: `Nessun nuovo movimento. ${result.duplicateCount} duplicati ignorati.`,
      });

      return;
    }

    const message =
      result.duplicateCount > 0
        ? `${result.insertedCount} movimenti importati. ${result.duplicateCount} duplicati ignorati.`
        : `${result.insertedCount} movimenti importati correttamente.`;

    setToast({
      type: "success",
      message,
    });

    setDatabaseMessage(
      `Database collegato. Transazioni cloud trovate: ${
        transactions.length + result.insertedCount
      }`,
    );
  }

  useEffect(() => {
    if (tab !== "settings") return;
    let cancelled = false;
    loadTaxonomy({ includeHidden: false })
      .then((data) => {
        if (!cancelled) setRuleTaxonomy(data);
      })
      .catch((error) => {
        if (!cancelled) {
          setToast({
            type: "error",
            message:
              error.message || "Impossibile caricare categorie e dettagli",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tab]);

  async function saveEditedRule() {
    if (!editingRule) return;
    setSavingRule(true);
    try {
      const saved = await updateMerchantRule(editingRule.id, {
        pattern: editingRule.pattern,
        normalized_merchant: editingRule.normalized_merchant,
        category: editingRule.category,
        category_id: editingRule.category_id,
        subcategory_id: editingRule.subcategory_id,
        microcategory_id:
          editingRule.microcategoryChoice === "__omit__"
            ? null
            : editingRule.microcategory_id,
        remember_microcategory:
          editingRule.microcategoryChoice !== "__omit__" &&
          Boolean(editingRule.microcategory_id),
        active: editingRule.active,
      });
      setRules((current) =>
        current.map((item) => (item.id === saved.id ? saved : item)),
      );
      setEditingRule(null);
      setToast({ type: "success", message: "Regola aggiornata" });
    } catch (error) {
      setToast({
        type: "error",
        message: error.message || "Aggiornamento non riuscito",
      });
    } finally {
      setSavingRule(false);
    }
  }

  function removeRule(rule) {
    setConfirmDialog({
      title: "Elimina regola di classificazione",
      message: `Vuoi eliminare la regola per “${rule.normalized_merchant || rule.pattern}”?`,
      detail:
        "I movimenti già classificati resteranno invariati. La regola non verrà più applicata ai nuovi import.",
      confirmLabel: "Elimina regola",
      danger: true,
      action: async () => {
        await deleteMerchantRule(rule.id);
        setRules((current) => current.filter((item) => item.id !== rule.id));
        if (editingRule?.id === rule.id) setEditingRule(null);
        setToast({ type: "success", message: "Regola eliminata" });
      },
    });
  }

  async function toggleRule(rule) {
    try {
      const saved = await updateMerchantRule(rule.id, {
        ...rule,
        active: !rule.active,
      });
      setRules((current) =>
        current.map((item) => (item.id === saved.id ? saved : item)),
      );
    } catch (error) {
      setToast({
        type: "error",
        message: error.message || "Modifica non riuscita",
      });
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
    <div className="h-[100dvh] w-full max-w-full overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12)_0,_transparent_28%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.10)_0,_transparent_24%),linear-gradient(to_bottom,_#f8fafc,_#eef2f7)] pb-24 text-slate-950 transition-colors duration-300 dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16)_0,_transparent_28%),radial-gradient(circle_at_top_right,_rgba(52,211,153,0.11)_0,_transparent_25%),linear-gradient(to_bottom,_#070b14,_#0b1220)] dark:text-slate-100">
      <div className="mx-auto h-full w-full min-w-0 max-w-7xl overflow-x-hidden overflow-y-auto px-3 pb-28 pt-4 [overscroll-behavior-y:contain] sm:px-6 sm:pb-6 sm:pt-5">
        <header className="mb-5 flex min-w-0 flex-col items-stretch gap-3 sm:mb-7 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between rounded-[1.75rem] border border-white/70 bg-white/70 p-4 shadow-lg shadow-slate-900/5 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/65 dark:shadow-black/20">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-600/20 dark:from-emerald-400 dark:to-cyan-500 dark:text-slate-950 dark:shadow-emerald-500/20">
              <Landmark />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-black sm:text-2xl tracking-tight text-slate-950 dark:text-white">
                Il mio patrimonio
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Chiarezza oggi, libertà domani.
              </p>
            </div>
          </div>
          <div className="hidden gap-2 sm:flex">
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
              variant="outline"
              className="rounded-2xl bg-white/70"
              onClick={() => setCsvModal(true)}
            >
              <Upload className="mr-2 h-4 w-4" />
              Importa CSV
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
        <div className="mb-5 flex min-w-0 flex-col items-stretch gap-3 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="hidden flex-wrap rounded-2xl bg-white/70 p-1 shadow-sm sm:flex">
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
          <div className="flex w-full min-w-0 items-center justify-between rounded-2xl bg-white/70 p-1 shadow-sm sm:w-auto">
            <button
              className="p-2"
              onClick={() => setMonth(shiftMonth(month, -1))}
            >
              <ChevronLeft size={18} />
            </button>
            <b className="min-w-0 flex-1 px-2 text-center capitalize sm:min-w-40">
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
          <OverviewDashboard
            transactions={transactions}
            budgets={budgets}
            month={month}
            onOpenInbox={() => setTab("inbox")}
            onEditTransaction={openEditMovement}
          />
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
                <b>Come funziona:</b> entrate e spese non ancora classificate
                restano nel limbo finché non assegni una categoria completa.
              </div>
              {pending.length ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/45">
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-bold">
                      <input
                        type="checkbox"
                        checked={
                          pending.length > 0 &&
                          selectedPendingIds.length === pending.length
                        }
                        onChange={(event) =>
                          setSelectedPendingIds(
                            event.target.checked
                              ? pending.map((item) => item.id)
                              : [],
                          )
                        }
                        className="h-4 w-4 accent-blue-600"
                      />
                      Seleziona tutti, entrate e spese
                    </label>
                    <div className="flex items-center gap-2">
                      {selectedPendingIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedPendingIds([])}
                          className="rounded-xl px-3 py-2 text-xs font-black text-slate-500 hover:bg-white dark:hover:bg-slate-700"
                        >
                          Deseleziona
                        </button>
                      )}
                      <Button
                        type="button"
                        onClick={openBulkClassification}
                        disabled={selectedPendingIds.length < 2}
                        className="rounded-xl"
                      >
                        Classifica insieme ({selectedPendingIds.length})
                      </Button>
                    </div>
                  </div>
                  {pending.map((t) => {
                    const selected = selectedPendingIds.includes(t.id);
                    return (
                      <div
                        key={t.id}
                        className={`flex w-full items-center gap-3 rounded-2xl border bg-white p-4 text-left shadow-sm transition dark:bg-slate-900 ${selected ? "border-blue-500 ring-2 ring-blue-500/15" : "border-orange-100 hover:border-orange-300 dark:border-orange-500/20"}`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={(event) =>
                            setSelectedPendingIds((current) =>
                              event.target.checked
                                ? [...new Set([...current, t.id])]
                                : current.filter((id) => id !== t.id),
                            )
                          }
                          className="h-5 w-5 shrink-0 accent-blue-600"
                          aria-label={`Seleziona ${t.description}`}
                        />
                        <button
                          type="button"
                          onClick={() => setReviewItem(t)}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-100 text-xl">
                            ❓
                          </div>
                          <div className="min-w-0 flex-1">
                            <b className="block truncate">{t.description}</b>
                            <span className="text-xs text-slate-400">
                              {new Date(
                                `${t.date}T12:00:00`,
                              ).toLocaleDateString("it-IT")}{" "}
                              ·{" "}
                              {t.source === "bank"
                                ? "Importata dalla banca"
                                : "Manuale"}
                            </span>
                            {t.suggested_category && (
                              <span className="mt-1 block text-xs font-bold text-orange-600">
                                Suggerimento: {t.suggested_category} ·
                                confidenza {Math.round(t.confidence * 100)}%
                              </span>
                            )}
                          </div>
                          <b
                            className={
                              t.type === "income"
                                ? "text-emerald-600"
                                : "text-rose-600"
                            }
                          >
                            {t.type === "income" ? "+" : "−"}
                            {euro.format(t.amount)}
                          </b>
                          <ChevronRight size={18} className="text-slate-300" />
                        </button>
                      </div>
                    );
                  })}
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
            className="grid items-start gap-4 lg:grid-cols-3"
          >
            <div className="lg:col-span-3">
              <TaxonomyManager
                onChanged={() => {
                  setToast({
                    type: "success",
                    message: "Organizzazione aggiornata",
                  });
                }}
              />
            </div>
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
            <div className="self-start">
              <Panel
                title="Regole di classificazione"
                subtitle="Create dalle tue conferme"
              >
                <div className="space-y-2">
                  {(showAllRules ? rules : rules.slice(0, 6)).map((r) => (
                    <div
                      key={r.id}
                      className={`rounded-xl border p-3 ${r.active ? "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/55" : "border-dashed border-slate-300 bg-slate-50/40 opacity-65 dark:border-slate-700 dark:bg-slate-800/25"}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="min-w-0 flex-1">
                          <b className="block truncate">
                            {r.normalized_merchant || r.pattern}
                          </b>
                          <small className="block truncate text-slate-400">
                            contiene “{r.pattern}”
                          </small>
                          <small className="mt-1 block font-bold text-slate-500 dark:text-slate-300">
                            {cat(r.category).icon}{" "}
                            {r.category || "Nessuna categoria"} ·{" "}
                            {r.active ? "Attiva" : "Disattivata"}
                          </small>
                        </span>
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setEditingRule({
                                ...r,
                                microcategoryChoice:
                                  r.remember_microcategory && r.microcategory_id
                                    ? r.microcategory_id
                                    : "__omit__",
                              })
                            }
                            className="grid h-9 w-9 place-items-center rounded-lg bg-white text-slate-500 hover:text-blue-600 dark:bg-slate-950 dark:text-slate-300"
                            aria-label="Modifica regola"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleRule(r)}
                            className="rounded-lg bg-white px-2.5 text-xs font-black text-slate-500 hover:text-emerald-600 dark:bg-slate-950 dark:text-slate-300"
                          >
                            {r.active ? "OFF" : "ON"}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeRule(r)}
                            className="grid h-9 w-9 place-items-center rounded-lg bg-white text-slate-500 hover:text-rose-600 dark:bg-slate-950 dark:text-slate-300"
                            aria-label="Elimina regola"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {rules.length > 6 && (
                    <button
                      type="button"
                      onClick={() => setShowAllRules((current) => !current)}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-600 transition hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-cyan-400/50 dark:hover:text-cyan-300"
                      aria-expanded={showAllRules}
                    >
                      {showAllRules ? (
                        <>
                          <ChevronUp className="h-4 w-4" />
                          Mostra meno
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4" />
                          Espandi tutte le regole ({rules.length})
                        </>
                      )}
                    </button>
                  )}
                </div>
              </Panel>
            </div>
            <div className="self-start">
              <Panel
                title="Budget mensili"
                subtitle="Crea voci personalizzate e salvale nel cloud"
              >
                <div className="space-y-4">
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/40">
                    <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                      Nuova voce
                    </label>
                    <div className="flex min-w-0 gap-2">
                      <Input
                        value={newBudgetName}
                        onChange={(event) => setNewBudgetName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            addCustomBudget();
                          }
                        }}
                        placeholder="Es. Benzina, Fondo emergenza..."
                        className="min-w-0 flex-1 rounded-xl"
                      />
                      <Button type="button" onClick={addCustomBudget} className="shrink-0 rounded-xl px-3">
                        <Plus className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Aggiungi</span>
                      </Button>
                    </div>
                  </div>

                  {Object.keys(budgetDraft).length ? (
                    <div className="space-y-2">
                      {Object.entries(budgetDraft).map(([name, value]) => (
                        <div key={name} className="grid min-w-0 grid-cols-[minmax(0,1fr)_7rem_2.5rem] items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-950">
                          <span className="min-w-0 truncate px-1 text-sm font-bold" title={name}>
                            {cat(name).icon} {name}
                          </span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            value={value ?? ""}
                            onChange={(event) =>
                              setBudgetDraft((current) => ({
                                ...current,
                                [name]: event.target.value,
                              }))
                            }
                            placeholder="0 €"
                            aria-label={`Budget mensile ${name}`}
                            className="min-w-0 rounded-xl text-right"
                          />
                          <button
                            type="button"
                            onClick={() => removeCustomBudget(name)}
                            className="grid h-10 w-10 place-items-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                            aria-label={`Elimina ${name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-400 dark:bg-slate-800/40">
                      Nessuna voce. Aggiungi il primo budget mensile.
                    </p>
                  )}

                  <div className="flex items-center justify-between rounded-xl bg-blue-50 px-3 py-2 text-sm dark:bg-blue-500/10">
                    <span className="font-bold text-blue-800 dark:text-blue-200">Totale pianificato</span>
                    <strong className="text-blue-950 dark:text-blue-100">
                      {euro.format(
                        Object.values(budgetDraft).reduce(
                          (total, value) => total + (Number(value) || 0),
                          0,
                        ),
                      )}
                    </strong>
                  </div>

                  <Button
                    className="h-11 w-full rounded-xl bg-slate-950"
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
            </div>
            <div className="self-start">
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
            </div>
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

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/80 bg-white/95 px-2 pt-2 shadow-[0_-8px_30px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-slate-700 dark:bg-slate-950/95 sm:hidden"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        aria-label="Navigazione mobile"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 items-end gap-1">
          <MobileNavButton active={tab === "dashboard"} icon={Wallet} label="Home" onClick={() => setTab("dashboard")} />
          <MobileNavButton active={tab === "movements"} icon={BarChart3} label="Movimenti" onClick={() => setTab("movements")} />
          <button type="button" onClick={openNewMovement} className="-mt-7 flex flex-col items-center gap-1" aria-label="Aggiungi movimento">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-950 text-white shadow-lg dark:bg-emerald-400 dark:text-slate-950"><Plus size={25} /></span>
            <span className="text-[10px] font-black text-slate-600 dark:text-slate-300">Aggiungi</span>
          </button>
          <MobileNavButton active={tab === "inbox"} icon={Inbox} label={pending.length ? `Limbo ${pending.length}` : "Limbo"} onClick={() => setTab("inbox")} />
          <MobileNavButton active={tab === "settings"} icon={Settings2} label="Altro" onClick={() => setTab("settings")} />
        </div>
      </nav>

      <Modal
        open={txModal}
        onClose={() => {
          setTxModal(false);
          setEditingId(null);
        }}
        wide
      >
        <TransactionDetailsEditor
          key={editingId || "new-movement"}
          transaction={
            editingId
              ? transactions.find((item) => item.id === editingId)
              : { type: "expense", date: today(), recurring: false }
          }
          mode="edit"
          transactions={transactions}
          saving={savingMovement}
          onCancel={() => {
            setTxModal(false);
            setEditingId(null);
          }}
          onSave={saveDetailedMovement}
        />
      </Modal>
      <Modal open={csvModal} onClose={() => setCsvModal(false)} wide>
        <CsvImporter
          rules={rules}
          onImport={handleCsvImport}
          onClose={() => setCsvModal(false)}
        />
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

      <Modal
        open={Boolean(bulkClassification)}
        onClose={() => !savingBulk && setBulkClassification(null)}
      >
        {bulkClassification && (
          <div>
            <ModalHead
              title={`Classifica ${selectedPendingIds.length} movimenti`}
              close={() => !savingBulk && setBulkClassification(null)}
            />
            <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900 dark:bg-blue-500/10 dark:text-blue-100">
              La stessa categoria, sottocategoria e microcategoria verranno
              applicate a tutte le entrate e spese selezionate. Nessuna regola
              automatica verrà creata.
            </p>
            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold">
                  Categoria
                </span>
                <select
                  value={bulkClassification.categoryId}
                  onChange={(event) =>
                    setBulkClassification({
                      categoryId: event.target.value,
                      subcategoryId: "",
                      microcategoryId: "",
                    })
                  }
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="">Seleziona categoria</option>
                  {ruleTaxonomy.categories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.icon || "•"} {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold">
                  Sottocategoria
                </span>
                <select
                  value={bulkClassification.subcategoryId}
                  disabled={!bulkClassification.categoryId}
                  onChange={(event) =>
                    setBulkClassification((current) => ({
                      ...current,
                      subcategoryId: event.target.value,
                      microcategoryId: "",
                    }))
                  }
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="">Nessuna sottocategoria</option>
                  {ruleTaxonomy.subcategories
                    .filter(
                      (item) =>
                        item.category_id === bulkClassification.categoryId,
                    )
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.icon || "•"} {item.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold">
                  Microcategoria
                </span>
                <select
                  value={bulkClassification.microcategoryId}
                  disabled={!bulkClassification.subcategoryId}
                  onChange={(event) =>
                    setBulkClassification((current) => ({
                      ...current,
                      microcategoryId: event.target.value,
                    }))
                  }
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="">Non inserire</option>
                  {ruleTaxonomy.microcategories
                    .filter(
                      (item) =>
                        !item.subcategory_id ||
                        item.subcategory_id ===
                          bulkClassification.subcategoryId,
                    )
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.icon || "•"} {item.name}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-11 rounded-xl"
                onClick={() => setBulkClassification(null)}
                disabled={savingBulk}
              >
                Annulla
              </Button>
              <Button
                className="h-11 rounded-xl"
                onClick={saveBulkClassification}
                disabled={savingBulk || !bulkClassification.categoryId}
              >
                {savingBulk ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                {savingBulk ? "Salvataggio" : "Conferma per tutti"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {editingRule && (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onMouseDown={() => setEditingRule(null)}
        >
          <section
            className="w-full max-w-lg rounded-t-[2rem] bg-white p-5 shadow-2xl dark:bg-slate-900 sm:rounded-[2rem] sm:p-6"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[.15em] text-blue-600 dark:text-cyan-400">
                  Regola personale
                </p>
                <h2 className="mt-2 text-2xl font-black">
                  Modifica classificazione automatica
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingRule(null)}
                className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
              La modifica vale per i movimenti importati in futuro. Quelli già
              classificati non vengono riscritti.
            </p>
            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold">
                  Testo da riconoscere
                </span>
                <Input
                  value={editingRule.pattern}
                  onChange={(event) =>
                    setEditingRule({
                      ...editingRule,
                      pattern: event.target.value,
                    })
                  }
                  className="rounded-xl"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold">
                  Nome esercente
                </span>
                <Input
                  value={editingRule.normalized_merchant || ""}
                  onChange={(event) =>
                    setEditingRule({
                      ...editingRule,
                      normalized_merchant: event.target.value,
                    })
                  }
                  className="rounded-xl"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold">
                  Categoria
                </span>
                <select
                  value={editingRule.category_id || ""}
                  onChange={(event) => {
                    const category = ruleTaxonomy.categories.find(
                      (item) => item.id === event.target.value,
                    );
                    setEditingRule({
                      ...editingRule,
                      category: category?.name || "",
                      category_id: category?.id || null,
                      subcategory_id: null,
                      microcategory_id: null,
                      microcategoryChoice: "__omit__",
                      remember_microcategory: false,
                    });
                  }}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="">Nessuna categoria</option>
                  {ruleTaxonomy.categories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.icon || "•"} {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-bold">
                  Sottocategoria
                </span>
                <select
                  value={editingRule.subcategory_id || ""}
                  disabled={!editingRule.category_id}
                  onChange={(event) =>
                    setEditingRule({
                      ...editingRule,
                      subcategory_id: event.target.value || null,
                      microcategory_id: null,
                      microcategoryChoice: "__omit__",
                      remember_microcategory: false,
                    })
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="">Nessuna sottocategoria</option>
                  {ruleTaxonomy.subcategories
                    .filter(
                      (item) => item.category_id === editingRule.category_id,
                    )
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.icon || "•"} {item.name}
                      </option>
                    ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-bold">
                  Microcategoria
                </span>
                <select
                  value={editingRule.microcategoryChoice || "__omit__"}
                  disabled={!editingRule.subcategory_id}
                  onChange={(event) => {
                    const value = event.target.value;
                    setEditingRule({
                      ...editingRule,
                      microcategoryChoice: value,
                      microcategory_id: value === "__omit__" ? null : value,
                      remember_microcategory: value !== "__omit__",
                    });
                  }}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="__omit__">Non inserire</option>
                  {ruleTaxonomy.microcategories
                    .filter(
                      (item) =>
                        !item.subcategory_id ||
                        item.subcategory_id === editingRule.subcategory_id,
                    )
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.icon || "•"} {item.name}
                      </option>
                    ))}
                </select>
                <small className="mt-1.5 block text-slate-400">
                  “Non inserire” applica categoria e sottocategoria ma lascia la
                  microcategoria vuota, quindi non viene conteggiata nei
                  relativi grafici.
                </small>
              </label>
              <label className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/55">
                <input
                  type="checkbox"
                  checked={editingRule.active}
                  onChange={(event) =>
                    setEditingRule({
                      ...editingRule,
                      active: event.target.checked,
                    })
                  }
                />
                <span>
                  <b className="block text-sm">Regola attiva</b>
                  <small className="text-slate-400">
                    Se disattivata, i nuovi movimenti non vengono classificati
                    automaticamente.
                  </small>
                </span>
              </label>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => setEditingRule(null)}
                className="h-11 rounded-xl"
              >
                Annulla
              </Button>
              <Button
                onClick={saveEditedRule}
                disabled={savingRule}
                className="h-11 rounded-xl"
              >
                {savingRule ? "Salvataggio..." : "Salva regola"}
              </Button>
            </div>
          </section>
        </div>
      )}

      <Modal open={!!reviewItem} onClose={() => setReviewItem(null)} wide>
        {reviewItem && (
          <TransactionDetailsEditor
            key={reviewItem.id}
            transaction={reviewItem}
            mode="review"
            transactions={transactions}
            saving={savingMovement}
            onCancel={() => setReviewItem(null)}
            onSave={saveDetailedReview}
          />
        )}
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
          {t.category || "Da classificare"}
          {t.subcategory_id ? " · Dettaglio assegnato" : ""}
          {t.microcategory_id ? " · Microcategoria assegnata" : ""} ·{" "}
          {t.source === "csv"
            ? "CSV"
            : t.source === "bank"
              ? "Banca"
              : "Manuale"}{" "}
          · {t.bank_status === "pending" ? "In sospeso" : "Contabilizzata"}
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
      {needsClassification(t) && (
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
function MobileNavButton({ active, icon: Icon, label, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-black ${active ? "bg-slate-100 text-slate-950 dark:bg-slate-800 dark:text-white" : "text-slate-400"}`}>
      <Icon size={20} />
      <span className="max-w-full truncate">{label}</span>
    </button>
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
