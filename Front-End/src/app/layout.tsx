import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { CartProvider } from "@/context/CartContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/context/ToastContext";
import { ConfirmProvider } from "@/context/ConfirmContext";
import "./globals.css";
import LayoutWrapper from "@/components/LayoutWrapper";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://barg.tj"),
  title: {
    default: "Barg.tj — Мағозаи Масолеҳи Сохтмонӣ",
    template: "%s · Barg.tj",
  },
  description:
    "Беҳтарин маҳсулоти сохтмонӣ бо нархи арзон ва расонидан ба хона. Barg.tj — мағозаи масолеҳи сохтмонии деҳаи шумо.",
  applicationName: "Barg.tj",
  openGraph: {
    type: "website",
    siteName: "Barg.tj",
    title: "Barg.tj — Мағозаи Масолеҳи Сохтмонӣ",
    description:
      "Беҳтарин маҳсулоти сохтмонӣ бо нархи арзон ва расонидан ба хона.",
    images: [{ url: "/logo.png", width: 600, height: 600, alt: "Barg.tj" }],
  },
};

// Runs before first paint to set the theme attribute synchronously (kills the dark-mode flash).
const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tj" className={inter.variable} suppressHydrationWarning>
      <body>
        <script
          id="theme-init"
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
        <ThemeProvider>
          <LanguageProvider>
            <CartProvider>
              <ToastProvider>
                <ConfirmProvider>
                  <LayoutWrapper>{children}</LayoutWrapper>
                </ConfirmProvider>
              </ToastProvider>
            </CartProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
