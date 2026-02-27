import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TaskForge - Project Management",
  description: "Modern project management application built with Next.js",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body className={inter.className}>
        {session ? (
          <div className="min-h-screen bg-background">
            <nav className="border-b">
              <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                <Link href="/" className="text-2xl font-bold">
                  TaskForge
                </Link>
                <div className="flex items-center gap-4">
                  <Link href="/" className="text-sm hover:underline">
                    Dashboard
                  </Link>
                  <Link href="/projects" className="text-sm hover:underline">
                    Projects
                  </Link>
                  <span className="text-sm text-muted-foreground">
                    {session.user?.name}
                  </span>
                  <form action="/api/auth/signout" method="POST">
                    <Button variant="outline" size="sm" type="submit">
                      Sign Out
                    </Button>
                  </form>
                </div>
              </div>
            </nav>
            <main className="container mx-auto px-4 py-8">{children}</main>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
