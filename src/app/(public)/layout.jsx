"use client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function RootLayout({ children }) {
  return (
    <>
      <Navbar />
      <main className="mt-15">{children}</main>
      <Footer />
    </>
  );
}
