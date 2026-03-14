import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "SkyRequest — Flight Request Portal",
  description:
    "Search, compare, and request your ideal flight in minutes. Our team handles the booking for you.",
  keywords: "flight search, book flights, flight request, travel portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-sky-50 flex flex-col">
        <AuthProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                borderRadius: "12px",
                background: "#1e3a8a",
                color: "#fff",
                fontSize: "14px",
              },
            }}
          />
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
