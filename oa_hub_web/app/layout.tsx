import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PrepTracker - Premium OA Hub",
  description: "The ultimate platform for tracking and practicing OA questions.",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://preptracker.example.com",
    siteName: "PrepTracker",
    images: [{
      url: "/og-image.png", // Verify if this exists later or use a placeholder
      width: 1200,
      height: 630,
      alt: "PrepTracker"
    }]
  },
  twitter: {
    card: "summary_large_image",
    title: "PrepTracker - Premium OA Hub",
    description: "The ultimate platform for tracking and practicing OA questions.",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
