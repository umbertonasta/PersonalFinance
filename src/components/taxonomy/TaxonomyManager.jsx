import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  FolderTree,
  LoaderCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Tag,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createCategory,
  createPurpose,
  createSubcategory,
  createTag,
  deleteTaxonomyItem,
  getTaxonomyUsage,
  loadTaxonomy,
  updateCategory,
  updatePurpose,
  updateSubcategory,
  updateTag,
} from "@/lib/taxonomyDb";

const TABS = [
  {
    id: "categories",
    label: "Categorie",
    singular: "categoria",
    icon: FolderTree,
  },
  {
    id: "subcategories",
    label: "Sottocategorie",
    singular: "sottocategoria",
    icon: ChevronDown,
  },
  { id: "purposes", label: "Finalita", singular: "finalita", icon: Target },
  { id: "tags", label: "Etichette", singular: "etichetta", icon: Tag },
];

const DEFAULT_FORM = {
  name: "",
  icon: "",
  color: "#64748b",
  categoryId: "",
  categoryType: "expense",
};

export default function TaxonomyManager({ onChanged }) {
  const [taxonomy, setTaxonomy] = useState({
    categories: [],
    subcategories: [],
    purposes: [],
    tags: [],
  });
  const [activeTab, setActiveTab] = useState("categories");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState(null);
  const [menuId, setMenuId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const activeConfiguration = TABS.find((tab) => tab.id === activeTab);

  async function refresh() {
    setLoading(true);
    setMessage(null);

    try {
      const data = await loadTaxonomy({ includeHidden: true });
      setTaxonomy(data);

      if (!selectedCategory && data.categories.length > 0) {
        setSelectedCategory(data.categories[0].id);
      }
    } catch (error) {
      setMessage({ type: "error", text: readableError(error) });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const visibleItems = useMemo(() => {
    let items = taxonomy[activeTab] || [];

    if (activeTab === "subcategories" && selectedCategory) {
      items = items.filter((item) => item.category_id === selectedCategory);
    }

    if (!showHidden) {
      items = items.filter((item) => !item.is_hidden);
    }

    return items;
  }, [taxonomy, activeTab, selectedCategory, showHidden]);

  const categoryMap = useMemo(
    () =>
      new Map(taxonomy.categories.map((category) => [category.id, category])),
    [taxonomy.categories],
  );

  function openCreate() {
    setMenuId(null);
    setEditor({
      mode: "create",
      item: null,
      form: {
        ...DEFAULT_FORM,
        categoryId: selectedCategory || taxonomy.categories[0]?.id || "",
        icon: activeTab === "categories" ? "📦" : "",
      },
    });
  }

  function openEdit(item) {
    setMenuId(null);
    setEditor({
      mode: "edit",
      item,
      form: {
        name: item.name,
        icon: item.icon || "",
        color: item.color || "#64748b",
        categoryId: item.category_id || selectedCategory || "",
        categoryType: item.category_type || "expense",
      },
    });
  }

  async function saveEditor() {
    if (!editor?.form.name.trim()) {
      setMessage({ type: "error", text: "Inserisci un nome." });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const { form, item, mode } = editor;

      if (activeTab === "categories") {
        if (mode === "create") {
          await createCategory({
            name: form.name,
            icon: form.icon || "📦",
            color: form.color,
            categoryType: form.categoryType,
          });
        } else {
          await updateCategory(item.id, {
            name: form.name,
            icon: form.icon || "📦",
            color: form.color,
            categoryType: form.categoryType,
          });
        }
      }

      if (activeTab === "subcategories") {
        if (!form.categoryId)
          throw new Error("Seleziona la categoria principale.");

        if (mode === "create") {
          await createSubcategory({
            categoryId: form.categoryId,
            name: form.name,
            icon: form.icon || null,
            color: form.color || null,
          });
        } else {
          await updateSubcategory(item.id, {
            categoryId: form.categoryId,
            name: form.name,
            icon: form.icon || null,
            color: form.color || null,
          });
        }
      }

      if (activeTab === "purposes") {
        if (mode === "create") {
          await createPurpose({
            name: form.name,
            icon: form.icon || null,
            color: form.color || null,
          });
        } else {
          await updatePurpose(item.id, {
            name: form.name,
            icon: form.icon || null,
            color: form.color || null,
          });
        }
      }

      if (activeTab === "tags") {
        if (mode === "create") {
          await createTag({ name: form.name, color: form.color });
        } else {
          await updateTag(item.id, { name: form.name, color: form.color });
        }
      }

      setEditor(null);
      setMessage({ type: "success", text: "Modifiche salvate." });
      await refresh();
      onChanged?.();
    } catch (error) {
      setMessage({ type: "error", text: readableError(error) });
    } finally {
      setSaving(false);
    }
  }

  async function toggleHidden(item) {
    setMenuId(null);
    setSaving(true);

    try {
      const changes = { isHidden: !item.is_hidden };

      if (activeTab === "categories") await updateCategory(item.id, changes);
      if (activeTab === "subcategories")
        await updateSubcategory(item.id, changes);
      if (activeTab === "purposes") await updatePurpose(item.id, changes);
      if (activeTab === "tags") await updateTag(item.id, changes);

      setMessage({
        type: "success",
        text: item.is_hidden ? "Elemento ripristinato." : "Elemento nascosto.",
      });
      await refresh();
      onChanged?.();
    } catch (error) {
      setMessage({ type: "error", text: readableError(error) });
    } finally {
      setSaving(false);
    }
  }

  async function prepareDelete(item) {
    setMenuId(null);
    setSaving(true);

    try {
      const usage = await getTaxonomyUsage(typeForTab(activeTab), item.id);
      setConfirmDelete({ item, usage });
    } catch (error) {
      setMessage({ type: "error", text: readableError(error) });
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem() {
    if (!confirmDelete) return;
    setSaving(true);

    try {
      await deleteTaxonomyItem(typeForTab(activeTab), confirmDelete.item.id);
      setConfirmDelete(null);
      setMessage({
        type: "success",
        text: "Elemento eliminato definitivamente.",
      });
      await refresh();
      onChanged?.();
    } catch (error) {
      setConfirmDelete(null);
      setMessage({ type: "error", text: readableError(error) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className={`relative rounded-[1.75rem] border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/75 sm:p-6 ${
        menuId ? "z-[60]" : "z-0"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600 dark:text-emerald-400">
            Organizzazione
          </p>
          <h2 className="mt-2 text-xl font-black text-slate-950 dark:text-white">
            Categorie e dettagli
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Personalizza solo cio che ti serve. Gli elementi nascosti restano
            disponibili nei dati storici, mentre quelli inutilizzati possono
            essere eliminati.
          </p>
        </div>

        <Button onClick={openCreate} className="h-11 shrink-0 rounded-2xl">
          <Plus size={17} />
          Aggiungi {activeConfiguration.singular}
        </Button>
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-2" role="tablist">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const selected = activeTab === tab.id;

          return (
            <button
              type="button"
              key={tab.id}
              role="tab"
              aria-selected={selected}
              onClick={() => {
                setActiveTab(tab.id);
                setMenuId(null);
                setMessage(null);
              }}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-bold transition ${
                selected
                  ? "bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "subcategories" && (
        <div className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/55">
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Categoria principale
          </label>
          <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            {taxonomy.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.icon} {category.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {visibleItems.length}{" "}
          {visibleItems.length === 1 ? "elemento" : "elementi"}
        </p>
        <button
          type="button"
          onClick={() => setShowHidden((current) => !current)}
          className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          {showHidden ? <EyeOff size={15} /> : <Eye size={15} />}
          {showHidden ? "Nascondi archiviati" : "Mostra nascosti"}
        </button>
      </div>

      {message && (
        <div
          className={`mt-4 rounded-xl border p-3 text-sm ${
            message.type === "error"
              ? "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200"
              : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
          }`}
          role="status"
        >
          {message.text}
        </div>
      )}

      <div className="relative isolate mt-4 space-y-2">
        {loading ? (
          <div className="flex min-h-36 items-center justify-center text-slate-400">
            <LoaderCircle className="h-6 w-6 animate-spin" />
          </div>
        ) : visibleItems.length ? (
          visibleItems.map((item) => (
            <TaxonomyRow
              key={item.id}
              item={item}
              category={categoryMap.get(item.category_id)}
              menuOpen={menuId === item.id}
              onMenu={() =>
                setMenuId((current) => (current === item.id ? null : item.id))
              }
              onEdit={() => openEdit(item)}
              onHide={() => toggleHidden(item)}
              onDelete={() => prepareDelete(item)}
            />
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center dark:border-slate-700">
            <Archive className="mx-auto h-8 w-8 text-slate-400" />
            <h3 className="mt-3 font-black text-slate-950 dark:text-white">
              Nessun elemento
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Aggiungi il primo elemento oppure mostra quelli nascosti.
            </p>
          </div>
        )}
      </div>

      {editor && (
        <Dialog onClose={() => !saving && setEditor(null)}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600 dark:text-emerald-400">
                {editor.mode === "create" ? "Nuovo elemento" : "Modifica"}
              </p>
              <h3 className="mt-2 text-xl font-black text-slate-950 dark:text-white">
                {editor.mode === "create" ? "Aggiungi" : "Modifica"}{" "}
                {activeConfiguration.singular}
              </h3>
            </div>
            <CloseButton onClick={() => setEditor(null)} />
          </div>

          <EditorFields
            activeTab={activeTab}
            form={editor.form}
            categories={taxonomy.categories}
            onChange={(changes) =>
              setEditor((current) => ({
                ...current,
                form: { ...current.form, ...changes },
              }))
            }
          />

          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => setEditor(null)}
              disabled={saving}
            >
              Annulla
            </Button>
            <Button onClick={saveEditor} disabled={saving}>
              {saving ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Check size={16} />
              )}
              Salva
            </Button>
          </div>
        </Dialog>
      )}

      {confirmDelete && (
        <Dialog onClose={() => !saving && setConfirmDelete(null)}>
          <div className="flex items-start justify-between gap-4">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
              <Trash2 size={20} />
            </div>
            <CloseButton onClick={() => setConfirmDelete(null)} />
          </div>

          <h3 className="mt-5 text-xl font-black text-slate-950 dark:text-white">
            Eliminare “{confirmDelete.item.name}”?
          </h3>

          <UsageMessage usage={confirmDelete.usage} />

          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => setConfirmDelete(null)}
              disabled={saving}
            >
              Annulla
            </Button>
            <Button
              variant="danger"
              onClick={deleteItem}
              disabled={
                saving ||
                confirmDelete.usage.transactions > 0 ||
                confirmDelete.usage.rules > 0 ||
                confirmDelete.usage.children > 0
              }
            >
              {saving ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 size={16} />
              )}
              Elimina
            </Button>
          </div>
        </Dialog>
      )}
    </section>
  );
}

function TaxonomyRow({
  item,
  category,
  menuOpen,
  onMenu,
  onEdit,
  onHide,
  onDelete,
}) {
  return (
    <div
      className={`relative flex items-center gap-3 rounded-2xl border p-3.5 transition ${
        item.is_hidden
          ? "border-dashed border-slate-300 bg-slate-50/50 opacity-70 dark:border-slate-700 dark:bg-slate-800/25"
          : "border-slate-200 bg-white/70 hover:border-slate-300 dark:border-white/10 dark:bg-slate-800/45 dark:hover:border-slate-600"
      }`}
      style={{
        zIndex: menuOpen ? 100 : 1,
      }}
    >
      <span
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-lg"
        style={{
          backgroundColor: `${item.color || category?.color || "#64748b"}20`,
        }}
      >
        {item.icon || category?.icon || "•"}
      </span>

      <div className="min-w-0 flex-1">
        <strong className="block truncate text-slate-950 dark:text-white">
          {item.name}
        </strong>

        <span className="text-xs text-slate-500 dark:text-slate-400">
          {category
            ? `${category.icon} ${category.name}`
            : item.is_hidden
              ? "Nascosto"
              : "Attivo"}
        </span>
      </div>

      {item.is_hidden && (
        <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500 dark:bg-slate-900 dark:text-slate-400 sm:block">
          Nascosto
        </span>
      )}

      <button
        type="button"
        onClick={onMenu}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-slate-700 dark:hover:text-white"
        aria-label={`Azioni per ${item.name}`}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
      >
        <MoreHorizontal size={19} />
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-3 top-[3.75rem] z-[110] w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl shadow-slate-950/20 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/50"
        >
          <MenuButton icon={Pencil} label="Modifica" onClick={onEdit} />

          <MenuButton
            icon={item.is_hidden ? RotateCcw : EyeOff}
            label={item.is_hidden ? "Ripristina" : "Nascondi"}
            onClick={onHide}
          />

          <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

          <MenuButton
            icon={Trash2}
            label="Elimina definitivamente"
            onClick={onDelete}
            danger
          />
        </div>
      )}
    </div>
  );
}

function EditorFields({ activeTab, form, categories, onChange }) {
  return (
    <div className="mt-6 space-y-4">
      {activeTab === "subcategories" && (
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
            Categoria principale
          </span>
          <select
            value={form.categoryId}
            onChange={(event) => onChange({ categoryId: event.target.value })}
            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-950 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            <option value="">Seleziona</option>
            {categories
              .filter((item) => !item.is_hidden)
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.icon} {category.name}
                </option>
              ))}
          </select>
        </label>
      )}

      <label className="block">
        <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
          Nome
        </span>
        <Input
          value={form.name}
          onChange={(event) => onChange({ name: event.target.value })}
          placeholder="Es. Benzina"
          className="h-12"
          autoFocus
        />
      </label>

      {activeTab !== "tags" && (
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
            Icona facoltativa
          </span>
          <Input
            value={form.icon}
            onChange={(event) => onChange({ icon: event.target.value })}
            placeholder="Es. ⛽"
            className="h-12"
          />
        </label>
      )}

      <label className="block">
        <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
          Colore
        </span>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={form.color}
            onChange={(event) => onChange({ color: event.target.value })}
            className="h-12 w-16 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-950"
          />
          <Input
            value={form.color}
            onChange={(event) => onChange({ color: event.target.value })}
            className="h-12 font-mono"
          />
        </div>
      </label>

      {activeTab === "categories" && (
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
            Tipo
          </span>
          <select
            value={form.categoryType}
            onChange={(event) => onChange({ categoryType: event.target.value })}
            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-950 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            <option value="expense">Spese</option>
            <option value="income">Entrate</option>
            <option value="both">Entrate e spese</option>
          </select>
        </label>
      )}
    </div>
  );
}

function UsageMessage({ usage }) {
  const used = usage.transactions > 0 || usage.rules > 0 || usage.children > 0;

  return (
    <div
      className={`mt-4 rounded-2xl border p-4 text-sm leading-6 ${
        used
          ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100"
          : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/55 dark:text-slate-300"
      }`}
    >
      {used ? (
        <>
          <strong className="block">
            Non puo essere eliminato direttamente.
          </strong>
          <span>
            Collegamenti: {usage.transactions} movimenti, {usage.rules} regole,{" "}
            {usage.children} sottocategorie. Puoi nasconderlo oppure spostare
            prima i dati collegati.
          </span>
        </>
      ) : (
        "Questo elemento non e utilizzato e puo essere eliminato in sicurezza."
      )}
    </div>
  );
}

function Dialog({ children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/65 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-auto rounded-t-[2rem] border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900 sm:rounded-[2rem]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function CloseButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-500 hover:text-slate-950 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white"
      aria-label="Chiudi"
    >
      <X size={18} />
    </button>
  );
}

function MenuButton({ icon: Icon, label, onClick, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${
        danger
          ? "text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10"
          : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
      }`}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

function typeForTab(tab) {
  return {
    categories: "category",
    subcategories: "subcategory",
    purposes: "purpose",
    tags: "tag",
  }[tab];
}

function readableError(error) {
  if (error?.code === "23505") return "Esiste gia un elemento con questo nome.";
  return error?.message || "Operazione non riuscita.";
}
