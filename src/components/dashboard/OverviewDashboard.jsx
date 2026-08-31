import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  ChevronRight,
  CircleDollarSign,
  Inbox,
  ReceiptText,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { loadTaxonomy } from "@/lib/taxonomyDb";
import PeriodSelector from "@/components/analytics/PeriodSelector";
import ExplorationCharts from "@/components/analytics/ExplorationCharts";
import CategoryComparison from "@/components/analytics/CategoryComparison";
import MerchantDetail from "@/components/analytics/MerchantDetail";
import {
  chooseGranularity,
  comparisonRange,
  inRange,
  rangeFromPreset,
  rangeDurationDays,
  todayIso,
} from "@/lib/dateRanges";
import AutomaticInsights from "@/components/analytics/AutomaticInsights";
import TransactionDrilldown from "@/components/analytics/TransactionDrilldown";
import SameMonthYears from "@/components/analytics/SameMonthYears";
import SpendingChangeDrivers from "@/components/analytics/SpendingChangeDrivers";
import TopChanges from "@/components/analytics/TopChanges";
import WeekendComparison from "@/components/analytics/WeekendComparison";
import MonthPhaseAnalysis from "@/components/analytics/MonthPhaseAnalysis";
import DashboardNavigator from "@/components/dashboard/DashboardNavigator";

const euro = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});
const monthKey = (date) => String(date || "").slice(0, 7);

export default function OverviewDashboard({
  transactions,
  budgets,
  month,
  onOpenInbox,
  onEditTransaction,
}) {
  const [taxonomy, setTaxonomy] = useState({
    categories: [],
    subcategories: [],
    microcategories: [],
    tags: [],
  });
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState(null);
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  const [periodPreset, setPeriodPreset] = useState("month");
  const [comparisonMode, setComparisonMode] = useState("previous");
  const [yearDetail, setYearDetail] = useState(null);
  const [customRange, setCustomRange] = useState({
    start: `${month}-01`,
    end: (() => {
      const monthEnd = new Date(
        new Date(`${month}-01T12:00:00`).getFullYear(),
        new Date(`${month}-01T12:00:00`).getMonth() + 1,
        0,
        12,
      )
        .toISOString()
        .slice(0, 10);
      return monthEnd > todayIso() ? todayIso() : monthEnd;
    })(),
  });
  const [customComparisonRange, setCustomComparisonRange] = useState({
    start: `${month}-01`,
    end: (() => {
      const monthEnd = new Date(
        new Date(`${month}-01T12:00:00`).getFullYear(),
        new Date(`${month}-01T12:00:00`).getMonth() + 1,
        0,
        12,
      )
        .toISOString()
        .slice(0, 10);
      return monthEnd > todayIso() ? todayIso() : monthEnd;
    })(),
  });
  const [insightDetail, setInsightDetail] = useState(null);

  useEffect(() => {
    loadTaxonomy({ includeHidden: true })
      .then(setTaxonomy)
      .catch(console.error);
  }, [transactions]);

  const range = useMemo(
    () => rangeFromPreset(periodPreset, month, transactions, customRange),
    [periodPreset, month, transactions, customRange],
  );
  const compareRange = useMemo(
    () =>
      comparisonRange(
        range,
        comparisonMode,
        month,
        transactions,
        customComparisonRange,
      ),
    [range, comparisonMode, month, transactions, customComparisonRange],
  );
  const rangeDays = rangeDurationDays(range);
  const comparisonDays = rangeDurationDays(compareRange);
  const model = useMemo(
    () =>
      buildDashboardModel(transactions, taxonomy, budgets, range, compareRange),
    [transactions, taxonomy, budgets, range, compareRange],
  );

  if (selectedCategoryId) {
    const category = taxonomy.categories.find(
      (item) => item.id === selectedCategoryId,
    );
    return (
      <CategoryDetail
        category={category}
        model={model}
        taxonomy={taxonomy}
        rangeLabel={range.label}
        range={range}
        compareRange={compareRange}
        transactions={transactions}
        selectedSubcategoryId={selectedSubcategoryId}
        onSelectSubcategory={setSelectedSubcategoryId}
        onBack={() => {
          setSelectedCategoryId(null);
          setSelectedSubcategoryId(null);
        }}
        onEditTransaction={onEditTransaction}
      />
    );
  }

  return (
    <motion.main
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-w-0 max-w-full space-y-4 overflow-x-hidden"
    >
      <PeriodSelector
        preset={periodPreset}
        onPresetChange={setPeriodPreset}
        comparison={comparisonMode}
        onComparisonChange={setComparisonMode}
        range={range}
        customRange={customRange}
        onCustomRangeChange={setCustomRange}
        comparisonRange={compareRange}
        customComparisonRange={customComparisonRange}
        onCustomComparisonRangeChange={setCustomComparisonRange}
      />
      <DashboardNavigator />
      {compareRange && (
        <p className="px-2 text-xs font-semibold text-slate-400">
          Confronto attivo con:{" "}
          <span className="capitalize">{compareRange.label}</span>
        </p>
      )}
      {compareRange && rangeDays !== comparisonDays && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
          I periodi hanno durate diverse: {rangeDays} giorni contro{" "}
          {comparisonDays} giorni. I totali restano confrontabili, ma la media
          giornaliera offre un confronto più equo.
        </div>
      )}
      <section
        id="overview"
        className="grid min-w-0 max-w-full scroll-mt-24 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <MetricCard
          title="Entrate"
          value={model.income}
          change={model.incomeChange}
          compareValue={model.comparisonIncome}
          kind="income"
          description="Totale delle entrate ricevute nel periodo selezionato"
          icon={ArrowUpRight}
          tone="emerald"
        />
        <MetricCard
          title="Spese"
          value={model.expenses}
          change={model.expenseChange}
          compareValue={model.comparisonExpenses}
          kind="expense"
          description="Totale delle uscite sostenute nel periodo selezionato"
          icon={ArrowDownRight}
          tone="rose"
        />
        <MetricCard
          title="Saldo del periodo"
          value={model.balance}
          description={`Entrate ${euro.format(model.income)} meno spese ${euro.format(model.expenses)}`}
          explanation={
            model.balance >= 0
              ? `Nel periodo sono rimasti ${euro.format(model.balance)}`
              : `Le spese superano le entrate di ${euro.format(Math.abs(model.balance))}`
          }
          icon={Wallet}
          tone="blue"
        />
        <MetricCard
          title="Tasso di risparmio"
          value={model.savingRate}
          percent
          description="Percentuale delle entrate rimasta dopo aver sottratto le spese"
          explanation={
            model.income > 0
              ? `Sono rimasti ${euro.format(Math.max(model.savingRate, 0))} ogni 100 € ricevuti`
              : "Non calcolabile senza entrate nel periodo"
          }
          icon={Target}
          tone="violet"
        />
      </section>

      <section className="grid min-w-0 max-w-full items-start gap-4 xl:grid-cols-[1.55fr_.85fr]">
        <DashboardPanel
          title="Il ritmo del tuo denaro"
          subtitle={`Entrate e spese · ${range.label}`}
        >
          <div className="mb-4 rounded-2xl border border-slate-200/70 bg-slate-50/60 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/35">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
              <span className="mr-1 font-black uppercase tracking-wide text-slate-400">
                Periodo selezionato
              </span>
              <LegendItem color="#34d399" label="Entrate" />
              <LegendItem color="#fb7185" label="Spese" />
            </div>
            {compareRange && (
              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-200/70 pt-2 text-xs dark:border-slate-700">
                <span className="mr-1 font-black uppercase tracking-wide text-slate-400">
                  Confronto
                </span>
                <LegendItem color="#34d399" label="Entrate" dashed />
                <LegendItem color="#fb7185" label="Spese" dashed />
                <span className="text-slate-400">{compareRange.label}</span>
              </div>
            )}
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={model.trend}
                margin={{ top: 12, right: 8, left: -18, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fb7185" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#fb7185" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="4 6"
                  opacity={0.13}
                />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  fontSize={12}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  fontSize={11}
                  tickFormatter={(value) => `${Math.round(value)} €`}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="income"
                  name="Entrate · periodo selezionato"
                  stroke="#34d399"
                  fill="url(#incomeFill)"
                  strokeWidth={3}
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  name="Spese · periodo selezionato"
                  stroke="#fb7185"
                  fill="url(#expenseFill)"
                  strokeWidth={3}
                />
                {compareRange && (
                  <Area
                    type="monotone"
                    dataKey="comparisonIncome"
                    name="Entrate · confronto"
                    stroke="#34d399"
                    fill="transparent"
                    strokeWidth={2}
                    strokeDasharray="7 6"
                    strokeOpacity={0.55}
                  />
                )}
                {compareRange && (
                  <Area
                    type="monotone"
                    dataKey="comparisonExpenses"
                    name="Spese · confronto"
                    stroke="#fb7185"
                    fill="transparent"
                    strokeWidth={2}
                    strokeDasharray="7 6"
                    strokeOpacity={0.55}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="Dove spendi - Categorie"
          subtitle="Distribuzione delle spese per categoria · seleziona una voce per approfondire"
        >
          <div className="relative h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={model.categories}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={88}
                  paddingAngle={3}
                  onClick={(entry) =>
                    entry.categoryId && setSelectedCategoryId(entry.categoryId)
                  }
                  className="cursor-pointer"
                >
                  {model.categories.map((item) => (
                    <Cell key={item.key} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <div>
                <strong className="block text-xl text-slate-950 dark:text-white">
                  {euro.format(model.expenses)}
                </strong>
                <span className="text-xs text-slate-400">spese totali</span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {model.categories.slice(0, 6).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() =>
                  item.categoryId
                    ? setSelectedCategoryId(item.categoryId)
                    : onOpenInbox()
                }
                className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <span
                  className="grid h-9 w-9 place-items-center rounded-xl"
                  style={{ backgroundColor: `${item.color}20` }}
                >
                  {item.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm text-slate-950 dark:text-white">
                    {item.name}
                  </strong>
                  <span className="text-xs text-slate-400">
                    {item.count} movimenti · {item.share.toFixed(0)}%
                  </span>
                </span>
                <strong className="text-sm text-slate-950 dark:text-white">
                  {euro.format(item.value)}
                </strong>
                <ChevronRight size={15} className="text-slate-400" />
              </button>
            ))}
          </div>
        </DashboardPanel>
      </section>

      <DashboardPanel
        title="Principali sottocategorie"
        subtitle="I dettagli che incidono maggiormente sulle spese del periodo"
      >
        {model.subcategories.length ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={model.subcategories.slice(0, 8)}
                layout="vertical"
                margin={{ left: 24, right: 32, top: 4, bottom: 4 }}
              >
                <CartesianGrid horizontal={false} opacity={0.12} />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  fontSize={11}
                  tickFormatter={(value) => `${Math.round(value)} €`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  width={125}
                  fontSize={12}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar
                  dataKey="value"
                  name="Spese"
                  fill="#38bdf8"
                  radius={[0, 10, 10, 0]}
                  className="cursor-pointer"
                  onClick={(item) =>
                    setInsightDetail({
                      title: `${item.name} · ${item.categoryName}`,
                      rows: item.rows,
                    })
                  }
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyText text="Assegna una sottocategoria ai movimenti per visualizzare questa analisi." />
        )}
      </DashboardPanel>

      <div className="dashboard-section-heading">
        <p className="section-kicker">Le tue entrate</p>
        <h2>Da dove arrivano i soldi?</h2>
        <p>
          Analisi separata delle entrate per categoria e sottocategoria. Il
          confronto con le spese resta nel grafico “Il ritmo del tuo denaro”.
        </p>
      </div>

      <section className="grid min-w-0 max-w-full items-start gap-4 xl:grid-cols-2">
        <DashboardPanel
          title="Entrate - Categorie"
          subtitle="Distribuzione delle entrate per categoria"
        >
          {model.incomeCategories.length ? (
            <>
              <div className="relative h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={model.incomeCategories}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={92}
                      paddingAngle={3}
                    >
                      {model.incomeCategories.map((item) => (
                        <Cell key={item.id} fill={item.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                  <div>
                    <strong className="block text-xl text-emerald-600 dark:text-emerald-300">
                      {euro.format(model.income)}
                    </strong>
                    <span className="text-xs text-slate-400">
                      entrate totali
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {model.incomeCategories.slice(0, 6).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      setInsightDetail({
                        title: `Entrate · ${item.name}`,
                        rows: item.rows,
                      })
                    }
                    className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <span
                      className="grid h-9 w-9 place-items-center rounded-xl"
                      style={{ backgroundColor: `${item.color}20` }}
                    >
                      {item.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-sm text-slate-950 dark:text-white">
                        {item.name}
                      </strong>
                      <span className="text-xs text-slate-400">
                        {item.count} movimenti · {item.share.toFixed(0)}%
                      </span>
                    </span>
                    <strong className="text-sm text-emerald-600 dark:text-emerald-300">
                      +{euro.format(item.value)}
                    </strong>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <EmptyText text="Nessuna entrata classificata nel periodo selezionato." />
          )}
        </DashboardPanel>

        <DashboardPanel
          title="Entrate - Sottocategorie"
          subtitle="Le fonti specifiche delle entrate del periodo"
        >
          {model.incomeSubcategories.length ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={model.incomeSubcategories.slice(0, 8)}
                  layout="vertical"
                  margin={{ left: 24, right: 32, top: 4, bottom: 4 }}
                >
                  <CartesianGrid horizontal={false} opacity={0.12} />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    fontSize={11}
                    tickFormatter={(value) => `${Math.round(value)} €`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    width={125}
                    fontSize={12}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar
                    dataKey="value"
                    name="Entrate"
                    fill="#34d399"
                    radius={[0, 10, 10, 0]}
                    className="cursor-pointer"
                    onClick={(item) =>
                      setInsightDetail({
                        title: `Entrate · ${item.name}`,
                        rows: item.rows,
                      })
                    }
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyText text="Assegna una sottocategoria alle entrate per visualizzare questa analisi." />
          )}
        </DashboardPanel>
      </section>

      <div id="categories" className="scroll-mt-24" />
      <SpendingChangeDrivers
        transactions={transactions}
        taxonomy={taxonomy}
        range={range}
        compareRange={compareRange}
        onOpen={setInsightDetail}
      />
      <div className="dashboard-section-heading">
        <p className="section-kicker">Aumenti e riduzioni</p>
        <h2>Cosa è cambiato rispetto al confronto?</h2>
        <p>
          Le variazioni confrontano il periodo selezionato con{" "}
          {compareRange ? compareRange.label : "il periodo di confronto"}. Gli
          aumenti indicano spese maggiori, le riduzioni spese minori.
        </p>
      </div>
      <TopChanges
        transactions={transactions}
        taxonomy={taxonomy}
        range={range}
        compareRange={compareRange}
        onOpen={setInsightDetail}
      />
      <CategoryComparison
        transactions={transactions}
        taxonomy={taxonomy}
        range={range}
        compareRange={compareRange}
        onOpenCategory={setSelectedCategoryId}
      />

      <SameMonthYears
        transactions={transactions}
        anchorMonth={month}
        onSelectYear={setYearDetail}
      />

      <div id="habits" className="dashboard-section-heading">
        <p className="section-kicker">Le tue abitudini</p>
        <h2>Quando e come tendi a spendere?</h2>
        <p>
          Ritmi settimanali, momenti del mese e distribuzione degli importi.
        </p>
      </div>
      <section className="grid min-w-0 max-w-full gap-4 xl:grid-cols-2">
        <WeekendComparison
          transactions={transactions}
          range={range}
          onOpen={setInsightDetail}
        />
        <MonthPhaseAnalysis
          transactions={transactions}
          range={range}
          onOpen={setInsightDetail}
        />
      </section>
      <ExplorationCharts
        transactions={transactions}
        range={range}
        compareRange={compareRange}
        onEditTransaction={onEditTransaction}
      />

      <div id="signals" className="scroll-mt-24" />
      <AutomaticInsights model={model} onOpen={setInsightDetail} />

      <section className="grid min-w-0 max-w-full items-start gap-4 xl:grid-cols-2">
        <DashboardPanel
          title="Budget sotto controllo"
          subtitle="Quanto spazio resta questo mese"
        >
          <div className="space-y-4">
            {model.budgetRows.length ? (
              model.budgetRows
                .slice(0, 6)
                .map((item) => (
                  <BudgetRow
                    key={item.name}
                    item={item}
                    onClick={() =>
                      item.categoryId && setSelectedCategoryId(item.categoryId)
                    }
                  />
                ))
            ) : (
              <EmptyText text="Imposta almeno un budget nella sezione Sistema." />
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="Da tenere d'occhio"
          subtitle="Segnali utili, senza allarmismi"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <Insight
              icon={Inbox}
              title={`${model.pendingCount} da classificare`}
              text={`${euro.format(model.pendingValue)} ancora senza categoria`}
              action={onOpenInbox}
              actionLabel="Controlla"
              tone="orange"
            />
            <Insight
              icon={ReceiptText}
              title={`${model.transactionCount} movimenti`}
              text={`Media spesa ${euro.format(model.averageExpense)}`}
              tone="blue"
            />
            <Insight
              icon={CircleDollarSign}
              title={model.topCategory?.name || "Nessuna categoria"}
              text={
                model.topCategory
                  ? `È il ${model.topCategory.share.toFixed(0)}% delle spese`
                  : "Classifica i movimenti per iniziare"
              }
              tone="emerald"
            />
          </div>
        </DashboardPanel>
      </section>

      <TransactionDrilldown
        detail={insightDetail}
        onClose={() => setInsightDetail(null)}
        onEdit={onEditTransaction}
      />

      <TransactionDrilldown
        detail={
          yearDetail
            ? {
                title: `${new Date(`${month}-01T12:00:00`).toLocaleDateString(
                  "it-IT",
                  {
                    month: "long",
                  },
                )} ${yearDetail.year}`,
                rows: yearDetail.rows,
              }
            : null
        }
        onClose={() => setYearDetail(null)}
        onEdit={onEditTransaction}
      />

      <MerchantDetail
        merchant={selectedMerchant}
        transactions={transactions}
        range={range}
        onClose={() => setSelectedMerchant(null)}
        onEditTransaction={onEditTransaction}
      />

      <MerchantDetail
        merchant={selectedMerchant}
        transactions={transactions}
        range={range}
        onClose={() => setSelectedMerchant(null)}
        onEditTransaction={onEditTransaction}
      />
    </motion.main>
  );
}

function CategoryDetail({
  category,
  model,
  taxonomy,
  selectedSubcategoryId,
  onSelectSubcategory,
  onBack,
  onEditTransaction,
  rangeLabel,
  range,
  compareRange,
  transactions,
}) {
  const categoryRows = model.periodRows.filter(
    (item) => item.type === "expense" && item.category_id === category?.id,
  );
  const filteredRows = selectedSubcategoryId
    ? categoryRows.filter(
        (item) => item.subcategory_id === selectedSubcategoryId,
      )
    : categoryRows;
  const subMap = new Map(taxonomy.subcategories.map((item) => [item.id, item]));
  const microcategoryMap = new Map(
    (taxonomy.microcategories || []).map((item) => [item.id, item]),
  );
  const subcategoryData = Object.values(
    categoryRows.reduce((acc, item) => {
      const sub = subMap.get(item.subcategory_id);
      const key = sub?.id || "none";
      acc[key] ||= {
        id: sub?.id || null,
        name: sub?.name || "Senza sottocategoria",
        icon: sub?.icon || "•",
        value: 0,
        color: sub?.color || category?.color || "#64748b",
      };
      acc[key].value += Number(item.amount);
      return acc;
    }, {}),
  ).sort((a, b) => b.value - a.value);
  const total = filteredRows.reduce(
    (sum, item) => sum + Number(item.amount),
    0,
  );
  const microcategories = Object.values(
    filteredRows.reduce((acc, item) => {
      const purpose = microcategoryMap.get(item.microcategory_id);
      const key = purpose?.id || "none";
      acc[key] ||= { name: purpose?.name || "Senza microcategoria", value: 0 };
      acc[key].value += Number(item.amount);
      return acc;
    }, {}),
  ).sort((a, b) => b.value - a.value);

  const comparisonCategoryRows = compareRange
    ? transactions.filter(
        (item) =>
          item.type === "expense" &&
          item.category_id === category?.id &&
          inRange(item.date, compareRange),
      )
    : [];
  const categoryTrend = buildCategoryTrend(
    categoryRows,
    comparisonCategoryRows,
    range,
    compareRange,
    selectedSubcategoryId,
  );
  return (
    <motion.main
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-4"
    >
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-500 hover:bg-white/70 dark:hover:bg-slate-800"
      >
        <ArrowLeft size={17} />
        Torna alla panoramica
      </button>
      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span
              className="grid h-16 w-16 place-items-center rounded-2xl text-3xl"
              style={{ backgroundColor: `${category?.color || "#64748b"}20` }}
            >
              {category?.icon || "•"}
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[.16em] text-slate-400">
                Dettaglio categoria
              </p>
              <h2 className="mt-1 text-3xl font-black text-slate-950 dark:text-white">
                {category?.name}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {filteredRows.length} movimenti · {rangeLabel}
              </p>
            </div>
          </div>
          <div className="text-right">
            <strong className="block text-3xl text-slate-950 dark:text-white">
              {euro.format(total)}
            </strong>
            <span className="text-sm text-slate-400">
              {filteredRows.length
                ? euro.format(total / filteredRows.length)
                : euro.format(0)}{" "}
              di media
            </span>
          </div>
        </div>
      </section>

      <section className="grid min-w-0 max-w-full gap-4 xl:grid-cols-[1.1fr_.9fr]">
        <DashboardPanel
          title="Sottocategorie"
          subtitle="Clicca una barra per filtrare la lista"
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={subcategoryData}
                layout="vertical"
                margin={{ left: 18, right: 24 }}
              >
                <CartesianGrid horizontal={false} opacity={0.12} />
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  width={115}
                  fontSize={12}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar
                  dataKey="value"
                  radius={[0, 10, 10, 0]}
                  onClick={(entry) =>
                    onSelectSubcategory(
                      entry.id === selectedSubcategoryId ? null : entry.id,
                    )
                  }
                  className="cursor-pointer"
                >
                  {subcategoryData.map((item) => (
                    <Cell
                      key={item.name}
                      fill={
                        item.id === selectedSubcategoryId
                          ? "#34d399"
                          : item.color
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashboardPanel>
        <DashboardPanel
          title="Microcategorie"
          subtitle="Il dettaglio specifico degli acquisti nel periodo"
        >
          <div className="space-y-3">
            {microcategories.length > 0 ? (
              microcategories.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between rounded-xl bg-slate-50/70 p-3 dark:bg-slate-800/45"
                >
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                    {item.name}
                  </span>

                  <strong className="text-slate-950 dark:text-white">
                    {euro.format(item.value)}
                  </strong>
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-400 dark:border-slate-700">
                Nessuna microcategoria assegnata nel periodo.
              </p>
            )}
          </div>
        </DashboardPanel>
      </section>

      <DashboardPanel
        title="Andamento della categoria"
        subtitle={
          selectedSubcategoryId
            ? `Storia di ${subMap.get(selectedSubcategoryId)?.name || "questa sottocategoria"}`
            : `Evoluzione di ${category?.name || "questa categoria"}`
        }
      >
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={categoryTrend} margin={{ left: -18, right: 8 }}>
              <CartesianGrid vertical={false} opacity={0.12} />
              <XAxis dataKey="label" fontSize={11} />
              <YAxis
                fontSize={11}
                tickFormatter={(value) => `${Math.round(value)} €`}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="current"
                name="Periodo scelto"
                stroke="#34d399"
                fill="#34d399"
                fillOpacity={0.14}
                strokeWidth={3}
              />
              {compareRange && (
                <Area
                  type="monotone"
                  dataKey="comparison"
                  name="Confronto"
                  stroke="#94a3b8"
                  fill="transparent"
                  strokeDasharray="6 6"
                  strokeWidth={2}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </DashboardPanel>

      <DashboardPanel
        title="Movimenti della categoria"
        subtitle={
          selectedSubcategoryId
            ? `Filtro: ${subMap.get(selectedSubcategoryId)?.name}`
            : "Tutte le sottocategorie"
        }
      >
        <div className="space-y-2">
          {[...filteredRows]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onEditTransaction(item)}
                className="flex w-full items-center gap-3 rounded-2xl border border-transparent bg-slate-50/70 p-3 text-left transition hover:border-slate-200 hover:bg-white dark:bg-slate-800/45 dark:hover:border-slate-700 dark:hover:bg-slate-800"
              >
                <span
                  className="grid h-10 w-10 place-items-center rounded-xl"
                  style={{
                    backgroundColor: `${category?.color || "#64748b"}20`,
                  }}
                >
                  {subMap.get(item.subcategory_id)?.icon ||
                    category?.icon ||
                    "•"}
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-slate-950 dark:text-white">
                    {item.description}
                  </strong>
                  <span className="text-xs text-slate-400">
                    {subMap.get(item.subcategory_id)?.name ||
                      "Senza sottocategoria"}
                    {item.microcategory_id
                      ? ` · ${microcategoryMap.get(item.microcategory_id)?.name || "Microcategoria"}`
                      : ""}{" "}
                    ·{" "}
                    {new Date(`${item.date}T12:00:00`).toLocaleDateString(
                      "it-IT",
                    )}
                  </span>
                </span>
                <strong className="text-rose-600">
                  −{euro.format(item.amount)}
                </strong>
              </button>
            ))}
        </div>
      </DashboardPanel>
    </motion.main>
  );
}

function MetricCard({
  title,
  value,
  change,
  compareValue,
  kind,
  description,
  explanation,
  icon: Icon,
  tone,
  percent,
}) {
  const colors = {
    emerald: "bg-emerald-400/12 text-emerald-600 dark:text-emerald-300",
    rose: "bg-rose-400/12 text-rose-600 dark:text-rose-300",
    blue: "bg-blue-400/12 text-blue-600 dark:text-blue-300",
    violet: "bg-violet-400/12 text-violet-600 dark:text-violet-300",
  };
  const increased = change > 0;
  const isGood = kind === "expense" ? !increased : increased;
  const direction = increased ? "in più" : "in meno";
  const subject = kind === "expense" ? "spese" : "entrate";
  const difference = compareValue == null ? null : value - compareValue;
  const DirectionIcon = increased ? TrendingUp : TrendingDown;

  return (
    <div className="rounded-[1.6rem] border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
      <div className={`inline-flex rounded-xl p-2.5 ${colors[tone]}`}>
        <Icon size={19} />
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-500 dark:text-slate-400">
        {title}
      </p>
      <strong className="mt-1 block text-2xl font-black tracking-tight text-slate-950 dark:text-white">
        {percent ? `${value.toFixed(1)}%` : euro.format(value)}
      </strong>
      {description && (
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          {description}
        </p>
      )}
      {change != null && Number.isFinite(change) && kind && (
        <div
          className={`mt-3 rounded-xl px-3 py-2 text-xs ${isGood ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-300" : "bg-rose-400/10 text-rose-600 dark:text-rose-300"}`}
        >
          <strong className="flex items-center gap-1.5">
            <DirectionIcon size={14} /> {Math.abs(change).toFixed(0)}% di{" "}
            {subject} {direction}
          </strong>
          {difference != null && (
            <span className="mt-1 block opacity-80">
              {euro.format(Math.abs(difference))} {direction} rispetto al
              confronto
            </span>
          )}
        </div>
      )}
      {explanation && (
        <p className="mt-3 text-xs font-semibold leading-relaxed text-slate-500 dark:text-slate-300">
          {explanation}
        </p>
      )}
    </div>
  );
}
function LegendItem({ color, label, dashed = false }) {
  return (
    <span className="inline-flex items-center gap-2 font-semibold text-slate-600 dark:text-slate-300">
      <span className="relative block h-2 w-7" aria-hidden="true">
        <span
          className="absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t-2"
          style={{
            borderColor: color,
            borderTopStyle: dashed ? "dashed" : "solid",
            opacity: dashed ? 0.65 : 1,
          }}
        />
        {!dashed && (
          <span
            className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ backgroundColor: color }}
          />
        )}
      </span>
      {label}
    </span>
  );
}

function DashboardPanel({ title, subtitle, children }) {
  return (
    <section className="min-w-0 max-w-full overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 sm:p-6">
      <h2 className="text-lg font-black text-slate-950 dark:text-white">
        {title}
      </h2>
      <p className="mb-5 mt-1 text-sm text-slate-400">{subtitle}</p>
      {children}
    </section>
  );
}
function BudgetRow({ item, onClick }) {
  const tone =
    item.ratio >= 1
      ? "bg-rose-500"
      : item.ratio >= 0.78
        ? "bg-amber-400"
        : "bg-emerald-400";
  return (
    <button type="button" onClick={onClick} className="block w-full text-left">
      <div className="flex items-center justify-between text-sm">
        <span className="font-bold text-slate-700 dark:text-slate-200">
          {item.icon} {item.name}
        </span>
        <span className="text-slate-400">
          {euro.format(item.spent)} / {euro.format(item.limit)}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full rounded-full ${tone}`}
          style={{ width: `${Math.min(item.ratio * 100, 100)}%` }}
        />
      </div>
    </button>
  );
}
function Insight({ icon: Icon, title, text, action, actionLabel, tone }) {
  const colors = {
    orange: "bg-orange-400/12 text-orange-500",
    blue: "bg-blue-400/12 text-blue-500",
    emerald: "bg-emerald-400/12 text-emerald-500",
  };
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-slate-50/70 p-4 dark:bg-slate-800/45">
      <span
        className={`grid h-11 w-11 place-items-center rounded-xl ${colors[tone]}`}
      >
        <Icon size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block text-sm text-slate-950 dark:text-white">
          {title}
        </strong>
        <span className="text-xs text-slate-400">{text}</span>
      </span>
      {action && (
        <button
          type="button"
          onClick={action}
          className="text-xs font-black text-orange-500"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
function EmptyText({ text }) {
  return (
    <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400 dark:border-slate-700">
      {text}
    </p>
  );
}
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 p-3 text-xs shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
      <strong className="mb-1 block text-slate-950 dark:text-white">
        {label || payload[0]?.payload?.name}
      </strong>
      {payload.map((item) => (
        <div
          key={item.dataKey || item.name}
          className="flex min-w-0 justify-between gap-3 text-slate-500 dark:text-slate-300"
        >
          <span>{item.name}</span>
          <b>{euro.format(item.value)}</b>
        </div>
      ))}
    </div>
  );
}

function buildDashboardModel(
  transactions,
  taxonomy,
  budgets,
  range,
  compareRange,
) {
  const categoryMap = new Map(
    taxonomy.categories.map((item) => [item.id, item]),
  );
  const periodRows = transactions.filter((item) => inRange(item.date, range));
  const comparisonRows = compareRange
    ? transactions.filter((item) => inRange(item.date, compareRange))
    : [];
  const income = sum(periodRows.filter((item) => item.type === "income"));
  const expenses = sum(periodRows.filter((item) => item.type === "expense"));
  const previousIncome = sum(
    comparisonRows.filter((item) => item.type === "income"),
  );
  const previousExpenses = sum(
    comparisonRows.filter((item) => item.type === "expense"),
  );
  const incomeRows = periodRows.filter(
    (item) =>
      item.type === "income" &&
      item.review_status === "verified" &&
      Boolean(item.category_id),
  );
  const incomeCategoryBuckets = new Map();
  incomeRows.forEach((item) => {
    const category = categoryMap.get(item.category_id);
    if (!category) return;
    const bucket = incomeCategoryBuckets.get(category.id) || {
      id: category.id,
      name: category.name,
      icon: category.icon || "•",
      color: category.color || "#34d399",
      value: 0,
      count: 0,
      rows: [],
    };
    bucket.value += Number(item.amount);
    bucket.count += 1;
    bucket.rows.push(item);
    incomeCategoryBuckets.set(category.id, bucket);
  });
  const incomeCategories = [...incomeCategoryBuckets.values()]
    .map((item) => ({
      ...item,
      share: income ? (item.value / income) * 100 : 0,
    }))
    .sort((first, second) => second.value - first.value);

  const incomeSubcategoryMap = new Map(
    (taxonomy.subcategories || []).map((item) => [item.id, item]),
  );
  const incomeSubcategoryBuckets = new Map();
  incomeRows
    .filter(
      (item) =>
        item.subcategory_id && incomeSubcategoryMap.has(item.subcategory_id),
    )
    .forEach((item) => {
      const subcategory = incomeSubcategoryMap.get(item.subcategory_id);
      const bucket = incomeSubcategoryBuckets.get(subcategory.id) || {
        id: subcategory.id,
        name: subcategory.name,
        categoryName:
          categoryMap.get(item.category_id)?.name || item.category || "Entrata",
        value: 0,
        count: 0,
        rows: [],
      };
      bucket.value += Number(item.amount);
      bucket.count += 1;
      bucket.rows.push(item);
      incomeSubcategoryBuckets.set(subcategory.id, bucket);
    });
  const incomeSubcategories = [...incomeSubcategoryBuckets.values()].sort(
    (first, second) => second.value - first.value,
  );
  const pending = periodRows.filter(
    (item) => item.type === "expense" && item.review_status !== "verified",
  );
  const categoryBuckets = {};

  periodRows
    .filter(
      (item) =>
        item.type === "expense" &&
        item.category_id &&
        item.review_status === "verified",
    )
    .forEach((item) => {
      const category = categoryMap.get(item.category_id);
      if (!category) return;
      categoryBuckets[item.category_id] ||= {
        key: item.category_id,
        categoryId: item.category_id,
        name: category.name,
        icon: category.icon,
        color: category.color,
        value: 0,
        count: 0,
      };
      categoryBuckets[item.category_id].value += Number(item.amount);
      categoryBuckets[item.category_id].count += 1;
    });

  const categories = Object.values(categoryBuckets)
    .map((item) => ({
      ...item,
      share: expenses ? (item.value / expenses) * 100 : 0,
    }))
    .sort((first, second) => second.value - first.value);

  if (pending.length) {
    categories.push({
      key: "pending",
      categoryId: null,
      name: "Da classificare",
      icon: "?",
      color: "#f97316",
      value: sum(pending),
      count: pending.length,
      share: expenses ? (sum(pending) / expenses) * 100 : 0,
    });
  }

  const budgetRows = Object.entries(budgets || {})
    .map(([name, limit]) => {
      const category = taxonomy.categories.find((item) => item.name === name);
      const spent = categories.find((item) => item.name === name)?.value || 0;
      return {
        name,
        limit: Number(limit),
        spent,
        ratio: Number(limit) ? spent / Number(limit) : 0,
        categoryId: category?.id,
        icon: category?.icon || "•",
      };
    })
    .filter((item) => item.limit > 0)
    .sort((first, second) => second.ratio - first.ratio);

  const subcategoryMap = new Map(
    (taxonomy.subcategories || []).map((item) => [item.id, item]),
  );
  const categoryNameMap = new Map(
    (taxonomy.categories || []).map((item) => [item.id, item.name]),
  );
  const subcategoryBuckets = new Map();
  periodRows
    .filter(
      (item) =>
        item.type === "expense" &&
        item.review_status === "verified" &&
        item.category_id &&
        item.subcategory_id &&
        subcategoryMap.has(item.subcategory_id),
    )
    .forEach((item) => {
      const subcategory = subcategoryMap.get(item.subcategory_id);
      const bucket = subcategoryBuckets.get(subcategory.id) || {
        id: subcategory.id,
        name: subcategory.name,
        categoryName:
          categoryNameMap.get(item.category_id) || item.category || "Categoria",
        value: 0,
        count: 0,
        rows: [],
      };
      bucket.value += Number(item.amount);
      bucket.count += 1;
      bucket.rows.push(item);
      subcategoryBuckets.set(subcategory.id, bucket);
    });
  const subcategories = [...subcategoryBuckets.values()].sort(
    (first, second) => second.value - first.value,
  );

  const trend = buildTrend(transactions, range, compareRange);
  const expenseCount = periodRows.filter(
    (item) => item.type === "expense",
  ).length;

  return {
    periodRows,
    income,
    incomeCategories,
    incomeSubcategories,
    topIncomeCategory: incomeCategories[0] || null,
    topIncomeSubcategory: incomeSubcategories[0] || null,
    expenses,
    balance: income - expenses,
    savingRate: income ? ((income - expenses) / income) * 100 : 0,
    comparisonIncome: compareRange ? previousIncome : null,
    comparisonExpenses: compareRange ? previousExpenses : null,
    incomeChange: compareRange ? change(income, previousIncome) : null,
    expenseChange: compareRange ? change(expenses, previousExpenses) : null,
    categories,
    budgetRows,
    subcategories,
    topSubcategory: subcategories[0] || null,
    trend,
    pendingCount: pending.length,
    pendingValue: sum(pending),
    transactionCount: periodRows.length,
    averageExpense: expenseCount ? expenses / expenseCount : 0,
    topCategory: categories.find((item) => item.categoryId),
  };
}

function buildTrend(transactions, range, compareRange) {
  const granularity = chooseGranularity(range);
  const currentStart = new Date(`${range.start}T12:00:00`);
  const comparisonStart = compareRange
    ? new Date(`${compareRange.start}T12:00:00`)
    : null;
  const buckets = new Map();

  function addRows(selectedRange, prefix, baseDate) {
    if (!selectedRange) return;
    transactions
      .filter((item) => inRange(item.date, selectedRange))
      .forEach((item) => {
        const date = new Date(`${item.date}T12:00:00`);
        let offset;
        let label;
        if (granularity === "day") {
          offset = Math.round((date - baseDate) / 86400000);
          label = new Date(
            currentStart.getTime() + offset * 86400000,
          ).toLocaleDateString("it-IT", { day: "numeric", month: "short" });
        } else if (granularity === "week") {
          offset = Math.floor((date - baseDate) / 86400000 / 7);
          label = `Set. ${offset + 1}`;
        } else {
          offset =
            (date.getFullYear() - baseDate.getFullYear()) * 12 +
            date.getMonth() -
            baseDate.getMonth();
          label = new Date(
            currentStart.getFullYear(),
            currentStart.getMonth() + offset,
            1,
            12,
          ).toLocaleDateString("it-IT", { month: "short", year: "2-digit" });
        }
        const bucket = buckets.get(offset) || {
          offset,
          label,
          income: 0,
          expenses: 0,
          comparisonIncome: 0,
          comparisonExpenses: 0,
        };
        const key = prefix
          ? `${prefix}${item.type === "income" ? "Income" : "Expenses"}`
          : item.type === "income"
            ? "income"
            : "expenses";

        bucket[key] += Number(item.amount);
        buckets.set(offset, bucket);
      });
  }

  addRows(range, "", currentStart);
  addRows(compareRange, "comparison", comparisonStart);
  return [...buckets.values()].sort((a, b) => a.offset - b.offset);
}

function buildCategoryTrend(
  currentRows,
  comparisonRows,
  range,
  compareRange,
  subcategoryId,
) {
  const filteredCurrent = subcategoryId
    ? currentRows.filter((item) => item.subcategory_id === subcategoryId)
    : currentRows;
  const filteredComparison = subcategoryId
    ? comparisonRows.filter((item) => item.subcategory_id === subcategoryId)
    : comparisonRows;
  const currentStart = new Date(`${range.start}T12:00:00`);
  const comparisonStart = compareRange
    ? new Date(`${compareRange.start}T12:00:00`)
    : null;
  const buckets = new Map();

  filteredCurrent.forEach((item) => {
    const offset = Math.round(
      (new Date(`${item.date}T12:00:00`) - currentStart) / 86400000,
    );
    const bucket = buckets.get(offset) || {
      offset,
      label: `Giorno ${offset + 1}`,
      current: 0,
      comparison: 0,
    };
    bucket.current += Number(item.amount);
    buckets.set(offset, bucket);
  });

  filteredComparison.forEach((item) => {
    const offset = Math.round(
      (new Date(`${item.date}T12:00:00`) - comparisonStart) / 86400000,
    );
    const bucket = buckets.get(offset) || {
      offset,
      label: `Giorno ${offset + 1}`,
      current: 0,
      comparison: 0,
    };
    bucket.comparison += Number(item.amount);
    buckets.set(offset, bucket);
  });

  return [...buckets.values()].sort((a, b) => a.offset - b.offset);
}

function sum(rows) {
  return rows.reduce((total, item) => total + Number(item.amount || 0), 0);
}
function change(current, previous) {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}
function shiftMonth(key, amount) {
  const date = new Date(`${key}-01T12:00:00`);
  date.setMonth(date.getMonth() + amount);
  return date.toISOString().slice(0, 7);
}
