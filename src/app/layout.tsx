import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { DashboardHeader } from "@/components/dashboard/header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CryptoRank - Live Crypto Ranking System",
  description: "Real-time cryptocurrency ranking based on sentiment, technical analysis, whale activity, and AI predictions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} antialiased bg-background text-foreground`}>
        <QueryProvider>
          <div className="min-h-screen flex flex-col">
            <DashboardHeader />
            <main className="flex-1">{children}</main>
            <footer className="border-t py-4">
              <div className="container text-center text-sm text-muted-foreground">
                <p>CryptoRank - Data from CoinGecko, LunarCrush, TAAPI, DefiLlama & more</p>
                <p className="mt-1">Not financial advice. Do your own research.</p>
              </div>
            </footer>
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
