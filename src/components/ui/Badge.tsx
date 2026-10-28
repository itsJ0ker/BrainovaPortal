import React from "react";
import clsx from "clsx";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "purple";
  size?: "sm" | "md";
  className?: string;
}

export function Badge({ children, variant = "default", size = "sm", className }: BadgeProps) {
  const variantStyles = {
    default: "bg-slate-100 text-slate-700 border-slate-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold",
    warning: "bg-amber-50 text-amber-800 border-amber-200 font-semibold",
    danger: "bg-rose-50 text-rose-700 border-rose-200 font-semibold",
    info: "bg-sky-50 text-sky-700 border-sky-200 font-semibold",
    purple: "bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-xs font-medium",
    md: "px-2.5 py-1 text-sm font-medium",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border tracking-wide",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  );
}
