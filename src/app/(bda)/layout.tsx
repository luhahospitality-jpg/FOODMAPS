import type { Metadata } from "next";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import BdaHeader from "@/components/bda/BdaHeader";
import BdaFooter from "@/components/bda/BdaFooter";
import "../bda-globals.css";

const fraunces = Fraunces({
  variable: "--font-bda-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-bda-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-bda-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "BDA — Branded Residences del mundo",
  description:
    "Un archivo documental de las branded residences del mundo: qué son, qué marcas las firman y dónde se construyen. Por BDA Realty, Commercial Leadership desde 1991.",
};

export default function BdaRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`bda ${fraunces.variable} ${inter.variable} ${plexMono.variable} h-full`}
    >
      <body className="bda min-h-full antialiased flex flex-col">
        <BdaHeader />
        <main className="flex-1">{children}</main>
        <BdaFooter />
      </body>
    </html>
  );
}
