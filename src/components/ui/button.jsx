import React from "react";

export function Button({
  className = "",
  variant = "default",
  type = "button",
  children,
  ...props
}) {
  const baseClasses =
    "inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 font-semibold tracking-[-0.01em] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-emerald-400 dark:focus-visible:ring-offset-slate-950";

  const variants = {
    default:
      "bg-slate-950 text-white shadow-sm shadow-slate-950/15 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-lg dark:bg-emerald-400 dark:text-slate-950 dark:shadow-emerald-500/15 dark:hover:bg-emerald-300",
    outline:
      "border border-slate-200 bg-white/80 text-slate-800 shadow-sm backdrop-blur hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-900/75 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800",
    ghost:
      "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
    danger:
      "bg-rose-600 text-white shadow-sm shadow-rose-600/20 hover:-translate-y-0.5 hover:bg-rose-500 hover:shadow-lg",
  };

  return (
    <button
      type={type}
      className={`${baseClasses} ${variants[variant] || variants.default} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
