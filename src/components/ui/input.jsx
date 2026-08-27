import React, { forwardRef } from "react";

export const Input = forwardRef(function Input(
  { className = "", type = "text", ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      className={`w-full border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 ${className}`}
      {...props}
    />
  );
});