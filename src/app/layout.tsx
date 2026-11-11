import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Big_Shoulders, Geist, Geist_Mono, Geist_Pixel } from "next/font/google";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MotionRoot } from "@/components/motion/MotionRoot";
import { LivePin } from "@/components/live/Live";
import { getSiteData } from "@/lib/data";
import "./globals.css";

const display = Big_Shoulders({ variable: "--font-big-shoulders", subsets: ["latin"], weight: ["700", "800", "900"] });
const sans = Geist({ variable: "--font-geist", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const pixel = Geist_Pixel({ variable: "--font-geist-pixel", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "INGEN · League of Legends", template: "%s · INGEN" },
  description: "Organização brasileira de League of Legends. Conheça a INGEN Black e a INGEN Silver: elencos, estatísticas, comparação de jogadores e scouting.",
  openGraph: { siteName: "INGEN", locale: "pt_BR", type: "website" },
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
        <Suspense>
          <LivePinMount />
        </Suspense>
      </body>
    </html>
  );
}
