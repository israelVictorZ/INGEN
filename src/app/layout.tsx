import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Big_Shoulders, Geist, Geist_Mono, Geist_Pixel } from "next/font/google";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MotionRoot } from "@/components/motion/MotionRoot";
import { ExternalLinks } from "@/components/site/ExternalLinks";
import { LivePin } from "@/components/live/Live";
import { getSiteData } from "@/lib/data";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const display = Big_Shoulders({ variable: "--font-big-shoulders", subsets: ["latin"], weight: ["700", "800", "900"] });
const sans = Geist({ variable: "--font-geist", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const pixel = Geist_Pixel({ variable: "--font-geist-pixel", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "INGEN · Time de League of Legends", template: "%s · INGEN" },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ["INGEN", "INGEN Black", "INGEN Silver", "League of Legends", "LoL", "time de LoL", "e-sports", "Solo/Duo", "elo", "scouting"],
  openGraph: { siteName: SITE_NAME, locale: "pt_BR", type: "website" },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
};

export const viewport: Viewport = { themeColor: "#04060a" };

/** Pin "ao vivo" global: precisa dos nomes dos jogadores para quando um deles estiver transmitindo. */
async function LivePinMount() {
  const { players } = await getSiteData();
  return <LivePin names={Object.fromEntries(players.map((p) => [p.slug, p.displayName]))} />;
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${display.variable} ${sans.variable} ${mono.variable} ${pixel.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <MotionRoot />
        <ExternalLinks />
        <Suspense>
          <LivePinMount />
        </Suspense>
      </body>
    </html>
  );
}
