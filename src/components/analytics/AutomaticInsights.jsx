import { Sparkles, ChevronRight } from "lucide-react";
export default function AutomaticInsights({ model, onOpen }) {
 const insights=[];
 if (model.pendingCount)
    insights.push({
      title: `${model.pendingCount} movimenti richiedono attenzione`,
      text: `${model.pendingIncomeCount || 0} entrate e ${model.pendingExpenseCount || 0} spese da classificare`,
      rows: model.periodRows.filter(
        (item) => item.review_status !== "verified" || !item.category_id,
      ),
    });
 if(model.topCategory) insights.push({title:`${model.topCategory.name} guida le spese`,text:`Incide per il ${model.topCategory.share.toFixed(0)}% nel periodo`,rows:model.periodRows.filter(x=>x.category_id===model.topCategory.categoryId)});
 const weekend=model.periodRows.filter(x=>x.type==="expense"&&[0,6].includes(new Date(`${x.date}T12:00:00`).getDay())); const all=model.periodRows.filter(x=>x.type==="expense"); const wt=weekend.reduce((s,x)=>s+Number(x.amount),0), at=all.reduce((s,x)=>s+Number(x.amount),0); if(weekend.length) insights.push({title:`Il weekend vale ${at ? (wt/at*100).toFixed(0):0}% delle spese`,text:`${weekend.length} movimenti tra sabato e domenica`,rows:weekend});
 return <section className="rounded-[1.75rem] border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 sm:p-6"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-400/12 text-cyan-500"><Sparkles size={21}/></span><div><h2 className="text-lg font-black dark:text-white">Insight automatici</h2><p className="text-sm text-slate-400">Osservazioni concrete ricavate dai dati</p></div></div><div className="mt-5 space-y-2">{insights.map((item,index)=><button key={index} type="button" onClick={()=>onOpen({title:item.title,rows:item.rows})} className="flex w-full items-center gap-3 rounded-2xl bg-slate-50 p-4 text-left dark:bg-slate-800/45"><span className="min-w-0 flex-1"><strong className="block dark:text-white">{item.title}</strong><span className="text-xs text-slate-400">{item.text}</span></span><ChevronRight size={17} className="text-slate-400"/></button>)}</div></section>;
}
