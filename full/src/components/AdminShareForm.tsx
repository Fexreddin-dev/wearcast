"use client";

import { useActionState } from "react";
import { grantAccess, type AdminState } from "@/app/actions/admin";
import type { Dictionary } from "@/i18n/dictionaries";

export default function AdminShareForm({ t }: { t: Dictionary["admin"] }) {
  const [state, action, pending] = useActionState<AdminState, FormData>(grantAccess, undefined);
  const message =
    state?.error === "not_found" ? t.notFound : state?.error ? t.invalidEmail : state?.ok ? t.granted : null;

  return (
    <form action={action} className="flex flex-col gap-2 sm:flex-row">
      <input className="field" type="email" name="email" required placeholder={t.emailPlaceholder} aria-label={t.emailPlaceholder} />
      <button className="btn btn-primary whitespace-nowrap" type="submit" disabled={pending}>{t.grant}</button>
      {message && <p role="status" className="text-xs text-text-2 sm:self-center">{message}</p>}
    </form>
  );
}
