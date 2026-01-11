import { DashboardHeader } from "@/components/dashboard/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
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
  );
}
