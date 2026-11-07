import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="wrap pb-20 pt-36 md:pb-28 md:pt-44">
      {children}
    </main>
  );
}
