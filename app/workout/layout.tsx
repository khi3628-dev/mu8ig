import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "운동 프로그램",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "운동 프로그램",
  },
};

export const viewport: Viewport = {
  themeColor: "#18181b",
  viewportFit: "cover",
};

export default function WorkoutLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
