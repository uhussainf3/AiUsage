import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AImpact — AI Productivity Tracker",
  description: "Track and verify AI-assisted productivity gains across the QA team",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
