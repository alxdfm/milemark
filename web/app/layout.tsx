import type { Metadata } from "next";
import { Geist, Geist_Mono, Syne } from "next/font/google";
import { ConfigBanner } from "@/components/config-banner";
import { Header } from "@/components/header";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "MileMark — onchain milestone escrow",
  description:
    "Sponsors lock USDC against ordered milestones on Arbitrum. An attestor marks work complete. The beneficiary claims released funds.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${syne.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <Providers>
          <ConfigBanner />
          <Header />
          {children}
          <footer className="mt-auto border-t border-line">
            <div className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p>MileMark · Arbitrum Open House Singapore Online Buildathon</p>
              <p>No oracles. No governance. USDC in, milestones out.</p>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
