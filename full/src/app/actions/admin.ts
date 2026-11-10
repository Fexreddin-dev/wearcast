"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { currentUser, isOwnerUser } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminState = { error?: "not_found" | "invalid" | "forbidden"; ok?: boolean } | undefined;

// Only the owner may change who has access or the budget.
async function ownerAdmin() {
  if (!isOwnerUser(await currentUser())) return null;
  return createAdminClient();
}

export async function grantAccess(_prev: AdminState, form: FormData): Promise<AdminState> {
  const admin = await ownerAdmin();
  if (!admin) return { error: "forbidden" };
  const email = z.email().safeParse(String(form.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { error: "invalid" };

  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const target = data.users.find((u) => u.email?.toLowerCase() === email.data);
  if (!target) return { error: "not_found" };

  const { error: e } = await admin.auth.admin.updateUserById(target.id, {
    app_metadata: { ...target.app_metadata, wearcast_unlimited: true },
  });
  if (e) throw e;
  revalidatePath("/[locale]/admin", "page");
  return { ok: true };
}

export async function revokeAccess(form: FormData) {
  const admin = await ownerAdmin();
  if (!admin) return;
  const id = z.uuid().safeParse(form.get("id"));
  if (!id.success) return;
  const { data } = await admin.auth.admin.getUserById(id.data);
  if (!data.user) return;
  await admin.auth.admin.updateUserById(id.data, {
    app_metadata: { ...data.user.app_metadata, wearcast_unlimited: false },
  });
  revalidatePath("/[locale]/admin", "page");
}

export async function setBudgetCap(form: FormData) {
  const admin = await ownerAdmin();
  if (!admin) return;
  const cap = z.coerce.number().min(0).max(1000).safeParse(form.get("cap"));
  if (!cap.success) return;
  await admin.from("app_settings").upsert({ key: "fal_budget_cap_usd", value: cap.data });
  revalidatePath("/[locale]/admin", "page");
}
