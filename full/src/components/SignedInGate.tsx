import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Locale } from "@/i18n/config";
import { createClient } from "@/lib/supabase/server";

async function Check({ locale }: { locale: Locale }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect(`/${locale}/wardrobe`);
  return null;
}

// Sign-in and sign-up make no sense for someone already signed in: they go straight to their Wardrobe.
// The form itself stays static; only this small check waits for the session.
export default function SignedInGate({ locale }: { locale: Locale }) {
  return (
    <Suspense fallback={null}>
      <Check locale={locale} />
    </Suspense>
  );
}
