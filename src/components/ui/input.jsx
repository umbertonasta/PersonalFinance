import React, { forwardRef } from "react";

export const Input = forwardRef(function Input(
  { className = "", type = "text", ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      className={`w-full rounded-xl border border-slate-200 bg-white/85 px-3 py-2 text-slate-950 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-600 dark:hover:border-slate-600 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/10 ${className}`}
      {...props}
    />
  );
});
