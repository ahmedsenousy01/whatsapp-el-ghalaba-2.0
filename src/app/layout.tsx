import { Suspense } from "react";

import { SessionProvider } from "next-auth/react";

import { GeistSans } from "geist/font/sans";

import { Providers } from "@/app/_components/providers";
import { Toaster } from "@/components/ui/toaster";
import { auth } from "@/server/auth";
import "@/styles/globals.css";
import { TRPCReactProvider } from "@/trpc/react";

export const metadata = {
  title: "Whatsapp El Ghalaba",
  description: "A secure chat application",
  icons: [{ rel: "icon", url: "/favicon.ico" }]
};

export default async function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html
      lang="en"
      className={GeistSans.variable}
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <SessionProvider session={session}>
          <TRPCReactProvider>
            <Providers>
              <Suspense>{children}</Suspense>
            </Providers>
            <Toaster />
          </TRPCReactProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
