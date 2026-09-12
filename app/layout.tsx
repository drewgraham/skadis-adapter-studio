import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SKÅDIS Adapter Studio",
  description: "Configure SKÅDIS adapters with automatic clip positioning and download printable STL and OpenSCAD files.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
