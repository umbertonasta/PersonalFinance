const items = [
  ["overview", "Panoramica"],
  ["installments", "Rate"],
  ["categories", "Categorie"],
  ["habits", "Abitudini"],
  ["signals", "Segnali"],
];

export default function DashboardNavigator() {
  return (
    <nav className="dashboard-nav" aria-label="Navigazione analisi">
      {items.map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => {
            const section = document.getElementById(id);
            if (!section) return;
            section.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
