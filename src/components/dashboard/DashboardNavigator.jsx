const items=[['overview','Panoramica'],['categories','Categorie'],['habits','Abitudini'],['signals','Segnali']];
export default function DashboardNavigator(){return <nav className="dashboard-nav" aria-label="Navigazione analisi">{items.map(([id,label])=><button key={id} onClick={()=>document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'})}>{label}</button>)}</nav>}
