"use client";

export function cn(...values) {
  return values.filter(Boolean).join(" ");
}

const panelVariants = {
  admin: "border-zinc-800 bg-zinc-950 text-zinc-100",
  adminMuted: "border-zinc-800 bg-zinc-900 text-zinc-100",
  business: "business-wallet-panel",
  merchant: "merchant-payments-panel",
  api: "api-docs-panel",
};

const metricVariants = {
  admin: "border-zinc-800 bg-black text-zinc-100",
  business: "business-wallet-metric rounded-xl border px-4 py-3",
  api: "api-docs-stat-item rounded-lg border px-3 py-3",
};

const pillVariants = {
  admin: "border-zinc-700 bg-zinc-950 text-zinc-300",
  business: "business-wallet-pill",
  api: "api-docs-pill",
};

const emptyVariants = {
  admin: "border-zinc-800 bg-black text-zinc-500",
  business: "business-wallet-empty-state",
  api: "api-docs-empty",
};

const buttonVariants = {
  plain: "",
  adminPrimary: "border-white bg-white text-black hover:bg-zinc-200",
  adminSecondary: "border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800",
  primary: "business-wallet-primary-button",
  secondary: "business-wallet-pill",
  danger: "border-red-500/40 text-red-200 hover:bg-red-500/10",
  dangerSolid: "border-red-600 bg-red-600 text-white hover:bg-red-500",
  filter: "operations-filter-button",
};

const inputVariants = {
  admin: "border-zinc-700 bg-black text-zinc-100 focus:border-white",
  business: "business-wallet-input",
};

export function DashboardPanel({ as: Component = "section", children, className = "", variant = "business", ...props }) {
  return (
    <Component className={cn(panelVariants[variant] || panelVariants.business, "rounded-2xl border p-4 sm:p-5", className)} {...props}>
      {children}
    </Component>
  );
}

export function DashboardMetric({ children, className = "", variant = "business" }) {
  return <div className={cn(metricVariants[variant] || metricVariants.business, className)}>{children}</div>;
}

export function DashboardInput({ className = "", variant = "business", ...props }) {
  return <input className={cn(inputVariants[variant] || inputVariants.business, "rounded-xl border px-4 text-sm outline-none", className)} {...props} />;
}

export function DashboardSelect({ className = "", variant = "business", ...props }) {
  return <select className={cn(inputVariants[variant] || inputVariants.business, "rounded-xl border px-3 text-sm outline-none", className)} {...props} />;
}

export function DashboardButton({ as: Component = "button", children, className = "", variant = "primary", ...props }) {
  return (
    <Component
      className={cn(buttonVariants[variant] ?? buttonVariants.primary, "rounded-xl border text-sm font-semibold transition", className)}
      {...props}
    >
      {children}
    </Component>
  );
}

export function DashboardPill({ children, className = "", as: Component = "span", variant = "business", ...props }) {
  return (
    <Component className={cn(pillVariants[variant] || pillVariants.business, "rounded-full border px-3 py-1 text-xs font-semibold", className)} {...props}>
      {children}
    </Component>
  );
}

export function DashboardEmptyState({ children, className = "", variant = "business" }) {
  return <p className={cn(emptyVariants[variant] || emptyVariants.business, "rounded-xl border px-4 py-3 text-sm", className)}>{children}</p>;
}
