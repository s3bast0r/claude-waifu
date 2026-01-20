"use client"

import type React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Home, MessageCircle, Github, Rocket } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"

// X/Twitter icon component
function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}


export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleChatClick = (e: React.MouseEvent) => {
    e.preventDefault()
    // Always go to chat list page
    router.push('/Waifu')
  }

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground hidden sm:inline">Claude Waifu</span>
          </Link>

          {/* Center Navigation Links */}
          <div className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
            <Link href="/">
              <Button
                variant={pathname === "/" ? "default" : "ghost"}
                size="sm"
                className="gap-2"
              >
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Home</span>
              </Button>
            </Link>

            <Button
              onClick={handleChatClick}
              variant={pathname === "/Waifu" ? "default" : "ghost"}
              size="sm"
              className="gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Chat</span>
            </Button>
          </div>

          {/* Right External Links - Icons Only */}
          <div className="flex items-center gap-2">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex"
            >
              <Button variant="ghost" size="sm" className="gap-2">
                <Github className="w-4 h-4" />
              </Button>
            </a>

            <a
              href="https://x.com/Claude_Waifu"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex"
            >
              <Button variant="ghost" size="sm" className="gap-2">
                <XIcon className="w-4 h-4" />
              </Button>
            </a>

            <a
              href="https://pump.fun/8FCJXB4t72SVvwbmBUEnXtRGJGYMN2PNKXtZCut1pump"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex"
            >
              <Button variant="ghost" size="sm" className="gap-2">
                <Rocket className="w-4 h-4" />
              </Button>
            </a>
          </div>
        </div>
      </div>
    </nav>
  )
}
