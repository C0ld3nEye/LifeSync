import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/layout/BottomNav";
import PWAInstallBanner from "@/components/layout/PWAInstallBanner";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { HouseholdProvider } from "@/components/providers/HouseholdProvider";
import { NotificationManager } from "@/components/providers/NotificationManager";
import { MealWeekProvider } from "@/components/providers/MealWeekProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LifeSync",
  description: "Votre assistant familial tout-en-un",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LifeSync",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#10b981",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${inter.className} bg-slate-50 text-slate-900 antialiased`}>
        <AuthProvider>
          <HouseholdProvider>
            <MealWeekProvider>
              <NotificationManager />
              <PWAInstallBanner />
              <main className="pb-20 min-h-screen">
                {children}
              </main>
              <BottomNav />
            </MealWeekProvider>
          </HouseholdProvider>
        </AuthProvider>
      </body>
    </html>
  );
}