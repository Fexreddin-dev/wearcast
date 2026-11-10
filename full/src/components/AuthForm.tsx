"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { login, signup } from "@/app/actions/auth";

type State = { error?: string; ok?: boolean } | undefined;

export default function AuthForm({ mode, locale, dict }: { mode: "login" | "signup"; locale: Locale; dict: Dictionary }) {
  const [state, action, pending] = useActionState<State, FormData>(mode === "login" ? login : signup, undefined);
  const t = dict.auth;
  const [showPassword, setShowPassword] = useState(false);
  const messages: Record<string, string> = {
    invalid: t.invalid,
    wrongCredentials: t.wrongCredentials,
    notConfirmed: t.notConfirmed,
    exists: t.exists,
    rateLimit: t.rateLimit,
    weak: t.weak,
    network: t.network,
  };
  const errorText = state?.error ? (messages[state.error] ?? t.genericError) : null;

  return (
    <div className="glass mx-auto mt-16 w-full max-w-md p-8">
      <h1 className="mb-6 font-serif text-3xl">{mode === "login" ? t.loginTitle : t.signupTitle}</h1>

      {state?.ok ? (
        <p className="text-sm text-text-2">{t.checkEmail}</p>
      ) : (
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="locale" value={locale} />
          <label className="flex flex-col gap-1 text-xs uppercase tracking-widest text-text-2">
            {t.email}
            <input className="field normal-case tracking-normal" type="email" name="email" autoComplete="email" required />
          </label>
          <label className="flex flex-col gap-1 text-xs uppercase tracking-widest text-text-2">
            {t.password}
            <span className="relative block">
              <input
                className="field !pr-12 normal-case tracking-normal"
                type={showPassword ? "text" : "password"}
                name="password"
                minLength={8}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-1 flex w-10 cursor-pointer items-center justify-center text-text-2"
                aria-label={showPassword ? t.hidePassword : t.showPassword}
                title={showPassword ? t.hidePassword : t.showPassword}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((v) => !v)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                  {showPassword && <path d="M4 4l16 16" />}
                </svg>
              </button>
            </span>
          </label>
          {errorText && <p role="alert" className="text-sm text-danger">{errorText}</p>}
          <button className="btn btn-primary mt-2" type="submit" disabled={pending}>
            {mode === "login" ? t.submitLogin : t.submitSignup}
          </button>
        </form>
      )}

      <p className="mt-6 text-sm text-text-2">
        {mode === "login" ? t.noAccount : t.haveAccount}{" "}
        <Link className="text-accent underline" href={`/${locale}/${mode === "login" ? "signup" : "login"}`}>
          {mode === "login" ? dict.nav.signUp : dict.nav.signIn}
        </Link>
      </p>
    </div>
  );
}
