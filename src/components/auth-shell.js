"use client";

import { Check, KeyRound, Link2, ShieldCheck } from "lucide-react";

const inputClassName =
  "h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-zinc-400 focus:bg-zinc-950";

const featureIcons = {
  api: KeyRound,
  checkout: Link2,
  secure: ShieldCheck,
};

export function AuthPageShell({ children, description, eyebrow, features, title }) {
  return (
    <main className="min-h-screen bg-black px-4 py-6 text-zinc-100 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl grid-cols-1 items-center gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-12">
        <section className="max-w-2xl">
          <p className="text-sm font-semibold text-emerald-300">{eyebrow}</p>
          <h1 className="mt-4 max-w-xl text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-[42px]">
            {title}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-400 sm:text-base">
            {description}
          </p>

          <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
            {features.map((feature) => {
              const Icon = featureIcons[feature.icon] || ShieldCheck;
              return (
                <div
                  key={feature.label}
                  className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 sm:px-4 sm:py-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-200 sm:h-8 sm:w-8">
                      <Icon size={17} strokeWidth={2.2} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-white sm:text-sm">{feature.value}</p>
                      <p className="mt-0.5 hidden truncate text-xs text-zinc-500 sm:block">{feature.label}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-5 shadow-2xl shadow-black/25 sm:p-6">
          {children}
        </section>
      </div>
    </main>
  );
}

export function AuthCardHeader({ description, title }) {
  return (
    <div className="mb-5">
      <h2 className="text-xl font-bold text-white sm:text-2xl">{title}</h2>
      <p className="mt-1.5 text-sm leading-6 text-zinc-400">{description}</p>
    </div>
  );
}

export function AuthField({ children, label }) {
  return (
    <div>
      <label htmlFor={children.props.id} className="mb-1.5 block text-sm font-medium text-zinc-300">
        {label}
      </label>
      {children}
    </div>
  );
}

export function AuthInput(props) {
  return <input {...props} className={inputClassName} />;
}

export function AuthMessage({ children, type = "error" }) {
  const isSuccess = type === "success";
  return (
    <div
      className={`rounded-lg border px-3 py-2.5 text-sm ${
        isSuccess
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
          : "border-red-500/30 bg-red-500/10 text-red-200"
      }`}
      role="alert"
    >
      {children}
    </div>
  );
}

export function AuthSubmitButton({ children, disabled }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="flex h-11 w-full items-center justify-center rounded-lg border border-white bg-white px-4 text-sm font-bold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function PasswordRequirementList({ requirements, t }) {
  return (
    <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
      {requirements.map((requirement) => (
        <li
          key={requirement.code}
          className={`flex min-w-0 items-center gap-2 ${
            requirement.met ? "text-emerald-300" : "text-zinc-500"
          }`}
        >
          <span
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
              requirement.met
                ? "border-emerald-400/50 bg-emerald-400/10"
                : "border-zinc-700 bg-zinc-900"
            }`}
          >
            {requirement.met && <Check size={11} strokeWidth={3} />}
          </span>
          <span className="truncate">{t(requirement.labelKey)}</span>
        </li>
      ))}
    </ul>
  );
}
