import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { notFound } from "next/navigation";
import Script from "next/script";
import { Suspense } from "react";
import "../globals.css";
import { isLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import Header from "@/components/Header";
import ThemeKeeper from "@/components/ThemeKeeper";

const inter = Inter({ variable: "--font-inter", subsets: ["latin", "latin-ext"] });
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "WearCast",
  description: "Your Weather. Your Wardrobe. Your Style.",
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

const themeScript = `(function(){try{var t=localStorage.getItem('wc-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.setAttribute('data-theme',t)}catch(e){}})();`;

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <html lang={locale} className={`${inter.variable} ${cormorant.variable}`} suppressHydrationWarning>
      <head>
        <Script id="wc-theme-init" strategy="beforeInteractive">
          {themeScript}
        </Script>
      </head>
      <body>
        <ThemeKeeper />
        <Suspense fallback={<div className="glass mx-3 mt-3 h-16" />}>
          <Header locale={locale} dict={dict} />
        </Suspense>
        <main>{children}</main>
      </body>
    </html>
  );
}
