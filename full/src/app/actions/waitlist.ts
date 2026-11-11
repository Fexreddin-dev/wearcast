"use server";

import { z } from "zod";
import { isLocale } from "@/i18n/config";
import { createAdminClient } from "@/lib/supabase/admin";

export type WaitlistState = { status: "ok" | "bad" | "fail" } | undefined;

// "Be the first to know": stores an email once. A hidden field that people never fill catches simple bots.
export async function joinWaitlist(_prev: WaitlistState, form: FormData): Promise<WaitlistState> {
  if (String(form.get("website") ?? "") !== "") return { status: "ok" };
  const email = z.email().max(254).safeParse(String(form.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { status: "bad" };
  const locale = String(form.get("locale") ?? "");
  const { error } = await createAdminClient()
    .from("waitlist")
    .upsert({ email: email.data, locale: isLocale(locale) ? locale : null }, { onConflict: "email", ignoreDuplicates: true });
  if (error) {
    console.error("[waitlist]", error.message);
    return { status: "fail" };
  }
  return { status: "ok" };
}
