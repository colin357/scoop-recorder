import type { Metadata } from "next";
import { Outfit, DM_Sans } from "next/font/google";
import "./globals.css";

const display = Outfit({ variable: "--font-display", subsets: ["latin"], weight: ["500", "600", "700"] });
const body = DM_Sans({ variable: "--font-body", subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: "Scoop — meeting recorder that turns calls into tasks",
  description: "Record Google Meet, Zoom and Teams calls. Get summaries and assigned, scheduled tasks automatically.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
