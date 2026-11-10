"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { defaultLocale, isLocale } from "@/i18n/config";

const credentials = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

// Logs the real cause on the server and gives the form a message the person can act on.
function authError(error: AuthError) {
  console.error("[auth]", error.name, error.status ?? "-", error.code ?? "-", error.message);
  if (error.name === "AuthRetryableFetchError" || !error.status) return { error: "network" };
  switch (error.code) {
    case "invalid_credentials":
      return { error: "wrongCredentials" };
    case "email_not_confirmed":
      return { error: "notConfirmed" };
    case "email_exists":
    case "user_already_exists":
      return { error: "exists" };
    case "weak_password":
      return { error: "weak" };
    case "email_address_invalid":
      return { error: "invalid" };
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return { error: "rateLimit" };
    default:
      return { error: "generic" };
  }
}

function localeFrom(form: FormData) {
  const l = String(form.get("locale") ?? "");
  return isLocale(l) ? l : defaultLocale;
}

export async function login(_prev: { error?: string } | undefined, form: FormData) {
  const locale = localeFrom(form);
  const parsed = credentials.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: "invalid" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return authError(error);
  redirect(`/${locale}/wardrobe`);
}

export async function signup(_prev: { error?: string; ok?: boolean } | undefined, form: FormData) {
  const locale = localeFrom(form);
  const parsed = credentials.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: "invalid" };

  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${origin}/auth/callback?locale=${locale}` },
  });
  if (error) return authError(error);
  return { ok: true };
}

export async function signOut(form: FormData) {
  const locale = localeFrom(form);
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/${locale}`);
}
