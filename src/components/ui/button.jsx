import React from "react";

export function Button({
  className = "",
  variant = "default",
  type = "button",
  children,
  ...props
}) {
  const baseClasses =
    "inline-flex items-center justify-center font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

  const variants = {
    default: "bg-slate-950 text-white hover:bg-slate-800",
    outline:
      "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
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