import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Navbar } from "@/components/navbar"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Claude Waifu | Token Companion",
  description: "Your Waifu companion that reacts to crypto market cap Waifuges in real-time",
  generator: "v0.app",
  icons: {
    icon: "/claude/hello.png",
    apple: "/claude/hello.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <Navbar />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
