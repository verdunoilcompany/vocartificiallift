import type { Metadata } from "next";
import localFont from "next/font/local";

import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { UserProvider } from "@/app/contexts/UserContext";

// Fonts are self-hosted from @fontsource packages so builds don't need internet access.
const sans = localFont({
  src: [
    { path: "../node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2", weight: "400" },
    { path: "../node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-500-normal.woff2", weight: "500" },
    { path: "../node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-600-normal.woff2", weight: "600" },
  ],
  variable: "--font-sans",
  display: "swap",
});
const mono = localFont({
  src: [
    { path: "../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2", weight: "400" },
    { path: "../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2", weight: "500" },
  ],
  variable: "--font-mono",
  display: "swap",
});
const display = localFont({
  src: [
    { path: "../node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-500-normal.woff2", weight: "500" },
    { path: "../node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-600-normal.woff2", weight: "600" },
    { path: "../node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-700-normal.woff2", weight: "700" },
  ],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s · Dynacard Classifier Review",
    default: "Dynacard Classifier Review",
  },
  description:
    "Review rod-pump downhole dynacards next to the typical shape of the label the classifier predicted.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sans.variable} ${mono.variable} ${display.variable}`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <UserProvider>
            <div className="flex min-h-full w-full flex-col">
              <Header />
              <main id="main" className="w-full flex-1">
                {children}
              </main>
              <Footer />
            </div>
            <Toaster richColors closeButton />
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
