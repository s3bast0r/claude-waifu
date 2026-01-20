"use client"

import type React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Home, MessageCircle, Github, Rocket, Sparkles } from "lucide-react"

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

export function Footer() {
  const router = useRouter()

  const handleChatClick = (e: React.MouseEvent) => {
    e.preventDefault()
    // Always go to chat list page
    router.push('/Waifu')
  }

  return (
    <footer className="border-t border-border bg-card/50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">Claude Waifu</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Your token companion that feels the market. Track Solana tokens and watch your Waifu react in real-time.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Navigation</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Home
                </Link>
              </li>
              <li>
                <button
                  onClick={handleChatClick}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Chat
                </button>
              </li>
            </ul>
          </div>

          {/* Social Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Connect</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                >
                  <Github className="w-4 h-4" />
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://x.com/Claude_Waifu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                >
                  <XIcon className="w-4 h-4" />
                  X (Twitter)
                </a>
              </li>
              <li>
                <a
                  href="https://pump.fun/8FCJXB4t72SVvwbmBUEnXtRGJGYMN2PNKXtZCut1pump"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                >
                  <Rocket className="w-4 h-4" />
                  pump.fun
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-8 border-t border-border text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Claude Waifu. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
