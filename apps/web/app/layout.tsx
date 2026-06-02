import type { Metadata } from "next";
import { AuthProvider } from "./components/auth/AuthProvider";
import { QueryProvider } from "./components/query/QueryProvider";
import { I18nProvider } from "./components/i18n/I18nProvider";
import { ThemePreferenceSynchronizer } from "./components/theme/ThemePreferenceSynchronizer";
import "./styles.css";

export const metadata: Metadata = {
  title: "AI Stock Advisor",
  description: "Track stocks and review market data from your personal watchlist.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <AuthProvider>
            <I18nProvider>
              <ThemePreferenceSynchronizer />
              {children}
            </I18nProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
