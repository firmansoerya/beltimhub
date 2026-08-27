import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Doto } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

const doto = Doto({
  variable: "--font-doto",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

export const metadata: Metadata = {
  title: "BeltimHub — Hub Digital Belitung Timur",
  description:
    "Platform digital terintegrasi untuk warga Kabupaten Belitung Timur. Berita lokal, jual beli, dan event komunitas.",
  keywords: ["Belitung Timur", "Beltim", "berita", "event", "jual beli", "FJB"],
  openGraph: {
    title: "BeltimHub — Hub Digital Belitung Timur",
    description:
      "Platform digital terintegrasi untuk warga Kabupaten Belitung Timur.",
    url: "https://beltim.id",
    siteName: "BeltimHub",
    locale: "id_ID",
    type: "website",
  },
};

const hasClerkKeys =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("xxxxx");

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const content = (
    <html lang="id">
      <body className={`${plusJakartaSans.variable} ${doto.variable} font-sans antialiased`} suppressHydrationWarning>
        <ConfirmProvider>
        {children}
        </ConfirmProvider>
        <Toaster />
      </body>
    </html>
  );

  if (!hasClerkKeys) return content;

  return <ClerkProvider>{content}</ClerkProvider>;
}
