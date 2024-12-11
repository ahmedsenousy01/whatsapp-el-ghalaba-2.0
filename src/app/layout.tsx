import { Suspense } from "react";

import { type Metadata } from "next";

import { GeistSans } from "geist/font/sans";

import { PollingServiceProvider } from "@/app/_components/providers/polling-service-provider";
import { Toaster } from "@/components/ui/toaster";
import "@/styles/globals.css";
import { TRPCReactProvider } from "@/trpc/react";

export const metadata: Metadata = {
  title: "Whatsapp El Ghalaba",
  description: "A Safer and Secure Whatsapp",
  icons: [{ rel: "icon", url: "/favicon.ico" }]
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable}`}
    >
      <body>
        <TRPCReactProvider>
          <Suspense>
            <PollingServiceProvider>{children}</PollingServiceProvider>
          </Suspense>
        </TRPCReactProvider>
        <Toaster />
      </body>
    </html>
  );
}
