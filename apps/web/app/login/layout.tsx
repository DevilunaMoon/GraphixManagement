import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | Graphix",
  description: "Graphix Management System Login",
  icons: {
    icon: '/icon.jpg?v=2',
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>;
}
