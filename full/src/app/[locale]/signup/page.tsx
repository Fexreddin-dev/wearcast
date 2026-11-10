import { notFound } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export default async function SignupPage({ params }: PageProps<"/[locale]/signup">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <AuthForm mode="signup" locale={locale} dict={getDictionary(locale)} />;
}
