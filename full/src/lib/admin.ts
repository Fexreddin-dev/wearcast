import "server-only";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const ownerEmail = () => process.env.ADMIN_EMAIL?.trim().toLowerCase();

/** The owner: the verified user whose email equals ADMIN_EMAIL. */
export function isOwnerUser(user: User | null | undefined) {
  const owner = ownerEmail();
  return !!owner && !!user?.email_confirmed_at && user.email?.toLowerCase() === owner;
}

/** The owner, or someone the owner gave access to. No credits, plan limits or budget cap apply. */
export function isUnlimitedUser(user: User | null | undefined) {
  if (!user?.email_confirmed_at) return false;
  return isOwnerUser(user) || user.app_metadata?.wearcast_unlimited === true;
}

export async function currentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}
