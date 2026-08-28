import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { buildChangeDrivers } from "@/lib/analytics";
const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
export default function SpendingChangeDrivers({ transactions, taxonomy, range, compareRange, onOpen }) {
  const data = useMemo(() => buildChangeDrivers(transactions, range, compareRange, taxonomy.categories), [transactions, range, compareRange, taxonomy.categories]);
  if (!compareRange || !data.length) return null;
  const leader = data[0];
  return <section className="tech-panel p-5 sm:p-6"><p className="section-kicker">Cosa è cambiato</p><h2 className="section-title">Perché le spese sono cambiate?</h2><p className="section-copy">Le barre a destra indicano aumenti, quelle a sinistra riduzioni. Premi una barra per vedere i movimenti.</p><div className="mt-5 h-80"><ResponsiveContainer><BarChart data={data.slice(0,8)} layout="vertical" margin={{left:18,right:25}}><CartesianGrid horizontal={false} opacity={.1}/><XAxis type="number" tickFormatter={(v)=>`${Math.round(v)} €`} fontSize={11}/><YAxis type="category" dataKey="name" width={105} fontSize={11}/><Tooltip formatter={(v)=>euro.format(v)}/><Bar dataKey="difference" name="Variazione" radius={[8,8,8,8]} onClick={(item)=>onOpen({title:item.name,rows:item.rows})} className="cursor-pointer">{data.slice(0,8).map(item=><Cell key={item.key} fill={item.difference>=0?"#fb7185":"#34d399"}/>)}</Bar></BarChart></ResponsiveContainer></div><button type="button" onClick={()=>onOpen({title:leader.name,rows:leader.rows})} className="insight-ribbon">{leader.icon} {leader.name} è il cambiamento più rilevante: {leader.difference >= 0 ? "+" : ""}{euro.format(leader.difference)}. <b>Esplora</b></button></section>;
}
