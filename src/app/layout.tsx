import { Suspense } from "react";

import { type Metadata } from "next";
import { SessionProvider } from "next-auth/react";

import { GeistSans } from "geist/font/sans";

import { PollingServiceProvider } from "@/app/_components/providers/polling-service-provider";
import { RSAKeyGenerationProvider } from "@/app/_components/providers/rsa-key-generation-provider";
import { Toaster } from "@/components/ui/toaster";
import { auth } from "@/server/auth";
import "@/styles/globals.css";
import { TRPCReactProvider } from "@/trpc/react";

export const metadata: Metadata = {
  title: "Whatsapp El Ghalaba",
  description: "A Safer and more Secure Whatsapp",
  icons: [{ rel: "icon", url: "/favicon.ico" }]
};

export default async function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  return (
    <html
      lang="en"
      className={`${GeistSans.variable}`}
    >
      <body>
        <SessionProvider session={session}>
          <TRPCReactProvider>
            <Suspense>
              <PollingServiceProvider>
                <RSAKeyGenerationProvider>{children}</RSAKeyGenerationProvider>
              </PollingServiceProvider>
            </Suspense>
          </TRPCReactProvider>
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
}
