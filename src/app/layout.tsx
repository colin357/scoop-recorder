import type { Metadata } from "next";
import { Outfit, DM_Sans } from "next/font/google";
import "./globals.css";

const display = Outfit({ variable: "--font-display", subsets: ["latin"], weight: ["500", "600", "700"] });
const body = DM_Sans({ variable: "--font-body", subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "https://www.scooprecorder.com"),
  title: "Scoop — the meeting ends, the work is already assigned",
  description: "Rocky learns how your team works, records your Google Meet, Zoom and Teams calls, and assigns the action items to the right people with the context they need.",
  openGraph: {
    title: "Scoop — the meeting ends, the work is already assigned",
    description: "Records your Google Meet, Zoom and Teams calls and routes every follow-up to the right person with the context to act.",
    url: "/",
    siteName: "Scoop",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Scoop" }],
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Scoop", description: "The meeting ends. The work is already assigned.", images: ["/og.png"] },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
