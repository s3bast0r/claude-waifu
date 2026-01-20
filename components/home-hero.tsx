"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function HomeHero() {
  const [contractAddress, setContractAddress] = useState("")
  const router = useRouter()

  // Load saved CA from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCA = localStorage.getItem('tokenCA')
      if (savedCA) {
        setContractAddress(savedCA)
      }
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedCA = contractAddress.trim()
    if (trimmedCA) {
      // Save to chat list
      if (typeof window !== 'undefined') {
        // Get existing chats
        const savedChats = localStorage.getItem('savedChats')
        let chats: Array<{ address: string; lastViewed?: number }> = []
        
        if (savedChats) {
          try {
            chats = JSON.parse(savedChats)
          } catch (e) {
            // If parsing fails, start fresh
            chats = []
          }
        }
        
        // Check if this address already exists
        const exists = chats.some(chat => chat.address === trimmedCA)
        if (!exists) {
          chats.push({ address: trimmedCA, lastViewed: Date.now() })
        } else {
          // Update last viewed
          chats = chats.map(chat =>
            chat.address === trimmedCA ? { ...chat, lastViewed: Date.now() } : chat
          )
        }
        
        // Save updated chats
        localStorage.setItem('savedChats', JSON.stringify(chats))
        // Also save for backward compatibility
        localStorage.setItem('tokenCA', trimmedCA)
      }
      router.push(`/waifu?ca=${encodeURIComponent(trimmedCA)}`)
    }
  }

  return (
    <div className="min-h-screen flex items-center px-4 py-12">
      <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 items-center">
        {/* Left Section - Text and Features */}
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">Claude Waifu</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight">
            Your token companion that <span className="text-primary">feels</span> the market
          </h1>

          {/* Description */}
          <p className="text-lg text-muted-foreground max-w-xl">
            Paste any token contract address and watch as your Waifu reacts to every pump, dump, and sideways crab in
            real-time.
          </p>

          {/* Feature List */}
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span className="text-muted-foreground">Real-time market cap tracking</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span className="text-muted-foreground">Emotional reactions to price action</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span className="text-muted-foreground">Live chat commentary on your bags</span>
            </li>
          </ul>
        </div>

        {/* Right Section - Waifu Image and Input */}
        <div className="space-y-6">
          {/* Waifu Image */}
          <div className="w-full aspect-square rounded-xl overflow-hidden bg-card border border-border">
            <img
              src="/claude/hello.png"
              alt="Waifu"
              className="w-full h-full object-cover"
            />
          </div>

          {/* CA Input Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="text"
              placeholder="Paste contract address..."
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
              className="h-14 w-full pl-5 pr-4 bg-card border-border text-foreground placeholder:text-muted-foreground rounded-xl text-base focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <Button
              type="submit"
              size="lg"
              className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold text-base"
            >
              Track Token
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </form>

          {/* Example CAs */}
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Try:</span>
            <button
              onClick={() => setContractAddress("So11111111111111111111111111111111111111112")}
              className="px-3 py-1.5 rounded-lg bg-card border border-border hover:bg-card/80 text-foreground transition-colors"
            >
              SOL
            </button>
            <button
              onClick={() => setContractAddress("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")}
              className="px-3 py-1.5 rounded-lg bg-card border border-border hover:bg-card/80 text-foreground transition-colors"
            >
              USDC
            </button>
            <button
              onClick={() => setContractAddress("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263")}
              className="px-3 py-1.5 rounded-lg bg-card border border-border hover:bg-card/80 text-foreground transition-colors"
            >
              BONK
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
