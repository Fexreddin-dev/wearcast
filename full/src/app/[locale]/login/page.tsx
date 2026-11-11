import { notFound } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import SignedInGate from "@/components/SignedInGate";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export default async function LoginPage({ params }: PageProps<"/[locale]/login">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <>
      <SignedInGate locale={locale} />
      <AuthForm mode="login" locale={locale} dict={getDictionary(locale)} />
    </>
  );
}
