import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { defaultLocale, isLocale } from "@/i18n/config";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const l = searchParams.get("locale") ?? "";
  const locale = isLocale(l) ? l : defaultLocale;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/${locale}/wardrobe`);
  }
  return NextResponse.redirect(`${origin}/${locale}/login`);
}
