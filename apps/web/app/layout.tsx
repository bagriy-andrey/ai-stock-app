import type { Metadata } from "next";
import { AuthProvider } from "./components/auth/AuthProvider";
import { QueryProvider } from "./components/query/QueryProvider";
import "./styles.css";

export const metadata: Metadata = {
  title: "AI Stock Advisor",
  description: "Mock stock analysis dashboard",
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
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
