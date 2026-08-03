import type { Metadata, Viewport } from "next";
import "./globals.css";
import { NavBar } from "@/components/layout/NavBar";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "Calorie & Weight Tracker",
  description: "Track daily calories, weight and trends.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <ToastProvider>
          <NavBar />
          <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-6">{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}
