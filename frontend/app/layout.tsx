import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Employee Leave",
  description: "Local employee leave application demo",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
