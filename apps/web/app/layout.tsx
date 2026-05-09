import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SecurityEnforcer from "../components/SecurityEnforcer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Graphix",
  description: "Graphix Management System",
  icons: {
    icon: '/icon.jpg?v=2',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SecurityEnforcer />
        {children}
      </body>
    </html>
  );
}
