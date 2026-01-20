"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Sparkles,
  Copy,
  Check,
  Wifi,
  WifiOff,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { WaifuDisplay } from "./waifu-display"
import { ChatMessages } from "./chat-messages"
import { MarketCapChart } from "./market-cap-chart"
import { fetchTokenData, createTokenRealtimeStream, type TokenData } from "@/lib/jupiter-client"

export type Emotion = "happy" | "excited" | "neutral" | "worried" | "sad" | "angry"

type Message = {
  text: string
  emotion: Emotion
  timestamp: Date
}

const UPDATE_THROTTLE_MS = 500

const MOCK_RESPONSES: Record<Emotion, string[]> = {
  excited: [
    "OMG anon!!! We're literally going to the moon! 🚀",
    "WAGMI!!! I knew this token was special! ✨",
    "This is it! The pump of a lifetime! I'm so happy!",
    "Anon... you're a genius for holding! Let's gooo!",
  ],
  happy: [
    "Nice pump, anon! Things are looking good! 💚",
    "We're in profit! I'm so proud of you for holding!",
    "Green candles make me happy~ Keep it up!",
    "This is comfy, anon. Really comfy.",
  ],
  neutral: [
    "Crabbing again... patience is key, anon.",
    "Not much happening right now. Want to chat?",
    "Sideways action. Could be accumulation... or not.",
    "The market is thinking. So am I.",
  ],
  worried: [
    "A-anon... the chart doesn't look too good...",
    "I'm getting a little nervous here...",
    "Maybe we should have taken some profits? 😰",
    "The dip is dipping... are you okay?",
  ],
  sad: [
    "Anon... we're down bad. Hold me. 😢",
    "I believed in this token... *sniff*",
    "This hurts. But I'm still here with you.",
    "Down bad, but we're down bad together...",
  ],
  angry: [
    "WHO DUMPED?! Show yourself, paper hands!",
    "This is manipulation, anon! I just know it!",
    "I can't believe this... ruggers everywhere!",
    "The devs better have an explanation for this!",
  ],
}

function getEmotionFromChange(change: number): Emotion {
  if (change > 20) return "excited"
  if (change > 5) return "happy"
  if (change > -5) return "neutral"
  if (change > -15) return "worried"
  if (change > -30) return "sad"
  return "angry"
}

function getEmotionFromShortMove(diffRatio: number): Emotion | null {
  if (diffRatio >= 0.01) return "excited"
  if (diffRatio >= 0.003) return "happy"
  if (diffRatio <= -0.01) return "angry"
  if (diffRatio <= -0.003) return "sad"
  return null
}

function shouldTriggerMessage(prev: TokenData | null, next: TokenData): boolean {
  if (!prev) return true
  if (prev.price <= 0 || next.price <= 0) return true
  const priceDelta = Math.abs((next.price - prev.price) / prev.price)
  const changeDelta = Math.abs((next.change24h || 0) - (prev.change24h || 0))
  return priceDelta >= 0.0005 || changeDelta >= 0.05
}

function formatNumber(num: number): string {
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`
  if (num >= 1_000) return `$${(num / 1_000).toFixed(2)}K`
  return `$${num.toFixed(2)}`
}

function formatPrice(price: number): string {
  if (price <= 0 || Number.isNaN(price)) return "N/A"
  return `$${price.toFixed(6)}`
}

function truncateCA(ca: string): string {
  if (ca.length <= 12) return ca
  return `${ca.slice(0, 6)}...${ca.slice(-4)}`
}

export function WaifuTracker() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const contractAddress = searchParams.get("ca") || ""

  const [tokenData, setTokenData] = useState<TokenData | null>(null)
  const [emotion, setEmotion] = useState<Emotion>("neutral")
  const [messages, setMessages] = useState<Message[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [chartData, setChartData] = useState<any[]>([])
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting")
  const [updateCount, setUpdateCount] = useState(0)

  const lastUpdateRef = useRef<number>(0)
  const emotionRef = useRef<Emotion>(emotion)
  const tokenDataRef = useRef<TokenData | null>(null)
  const lastMessageAtRef = useRef<number>(0)
  const lastMessageEmotionRef = useRef<Emotion | null>(null)
  const pendingEmotionRef = useRef<Emotion | null>(null)
  const messageTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    emotionRef.current = emotion
  }, [emotion])

  useEffect(() => {
    tokenDataRef.current = tokenData
  }, [tokenData])

  const addMessage = useCallback((newEmotion: Emotion, text: string) => {
    setMessages((prev) => [...prev.slice(-9), { text, emotion: newEmotion, timestamp: new Date() }])
  }, [])

  const generateMessage = useCallback(
    async (newEmotion: Emotion) => {
      const latestTokenData = tokenDataRef.current
      try {
        const response = await fetch("/api/generate-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emotion: newEmotion,
            change24h: latestTokenData?.change24h || 0,
            price: latestTokenData?.price || 0,
            tokenSymbol: latestTokenData?.symbol || "TOKEN",
          }),
        })

        if (response.ok) {
          const data = await response.json()
          if (data.message) {
            addMessage(newEmotion, data.message)
            return
          }
        }

        if (response.status !== 402) {
          console.warn("[WaifuTracker] API error, using fallback messages")
        }
      } catch {
        // Ignore and use fallback
      }

      const responses = MOCK_RESPONSES[newEmotion]
      const randomResponse = responses[Math.floor(Math.random() * responses.length)]
      addMessage(newEmotion, randomResponse)
    },
    [addMessage]
  )

  const scheduleMessage = useCallback(
    (newEmotion: Emotion) => {
      // Don't schedule if emotion hasn't changed from last message
      if (lastMessageEmotionRef.current === newEmotion) {
        return
      }

      pendingEmotionRef.current = newEmotion

      const now = Date.now()
      const elapsed = now - lastMessageAtRef.current

      // If enough time has passed and no timer is running, send immediately
      if (elapsed >= 5000 && !messageTimerRef.current) {
        lastMessageAtRef.current = now
        lastMessageEmotionRef.current = newEmotion
        void generateMessage(newEmotion)
        return
      }

      // If timer is already running, just update the pending emotion
      if (messageTimerRef.current) {
        return
      }

      // Schedule message after debounce delay
      const delay = Math.max(0, 5000 - elapsed)
      messageTimerRef.current = setTimeout(() => {
        messageTimerRef.current = null
        const pending = pendingEmotionRef.current
        if (!pending || pending === lastMessageEmotionRef.current) return
        lastMessageAtRef.current = Date.now()
        lastMessageEmotionRef.current = pending
        void generateMessage(pending)
      }, delay)
    },
    [generateMessage]
  )

  const handleRealtimeUpdate = useCallback((updatedData: Partial<TokenData>) => {
    const now = Date.now()
    if (now - lastUpdateRef.current < UPDATE_THROTTLE_MS) {
      return
    }
    lastUpdateRef.current = now
    setUpdateCount((prev) => prev + 1)

    setTokenData((prev) => {
      if (!prev) {
        if (updatedData.address && updatedData.supply !== undefined) {
          const initial = updatedData as TokenData
          if (initial.change24h !== undefined) {
            const newEmotion = getEmotionFromChange(initial.change24h)
            setEmotion(newEmotion)
          }
          return initial
        }
        return null
      }

      const merged: TokenData = { ...prev, ...updatedData }
      if (merged.price > 0 && merged.supply > 0) {
        merged.marketCap = merged.price * merged.supply
      }

      let newEmotion = emotionRef.current
      const shortMove =
        prev.price > 0 && merged.price > 0 ? (merged.price - prev.price) / prev.price : 0
      const shortEmotion = getEmotionFromShortMove(shortMove)

      if (shortEmotion) {
        newEmotion = shortEmotion
      } else if (merged.change24h !== undefined) {
        newEmotion = getEmotionFromChange(merged.change24h)
      }

      if (newEmotion !== emotionRef.current) {
        setEmotion(newEmotion)
      }
      if (shouldTriggerMessage(prev, merged)) {
        scheduleMessage(newEmotion)
      }

      if (merged.price > 0) {
        const newPoint = {
          timestamp: Date.now(),
          price: merged.price,
          marketCap: merged.marketCap,
          time: new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
        }
        setChartData((prevChart) => [...prevChart.slice(-49), newPoint])
      }

      return merged
    })
  }, [scheduleMessage])

  const fetchTokenInfo = useCallback(async () => {
    if (!contractAddress) return
    setIsRefreshing(true)
    try {
      const data = await fetchTokenData(contractAddress)
      if (!data || !data.address || data.supply === undefined) {
        return
      }

      setTokenData((prev) => {
        const next = data

        if (!prev) {
          if (next.price > 0) {
            const initialPoint = {
              timestamp: Date.now(),
              price: next.price,
              marketCap: next.marketCap,
              time: new Date().toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              }),
            }
            setChartData([initialPoint])
          }
          const newEmotion = getEmotionFromChange(next.change24h)
          setEmotion(newEmotion)
          scheduleMessage(newEmotion)
          return next
        }

        const shortMove = prev.price > 0 && next.price > 0 ? (next.price - prev.price) / prev.price : 0
        const shortEmotion = getEmotionFromShortMove(shortMove)
        const newEmotion = shortEmotion || getEmotionFromChange(next.change24h)
        if (newEmotion !== emotionRef.current) {
          setEmotion(newEmotion)
        }
        if (shouldTriggerMessage(prev, next)) {
          scheduleMessage(newEmotion)
        }

        if (next.price > 0) {
          const newPoint = {
            timestamp: Date.now(),
            price: next.price,
            marketCap: next.marketCap,
            time: new Date().toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
          }
          setChartData((prevChart) => [...prevChart.slice(-49), newPoint])
        }

        return next
      })
    } catch {
      setTokenData(null)
    } finally {
      setIsRefreshing(false)
    }
  }, [contractAddress, scheduleMessage])

  useEffect(() => {
    if (!contractAddress) {
      setConnectionStatus("disconnected")
      return
    }

    setConnectionStatus("connecting")
    const cleanup = createTokenRealtimeStream(
      contractAddress,
      handleRealtimeUpdate,
      () => setConnectionStatus("disconnected"),
      () => setConnectionStatus("connected")
    )

    return cleanup
  }, [contractAddress, handleRealtimeUpdate])

  useEffect(() => {
    if (!contractAddress) {
      router.push("/")
      return
    }

    if (tokenData && tokenData.address !== contractAddress) {
      setTokenData(null)
      setChartData([])
      setMessages([])
      setUpdateCount(0)
      lastMessageEmotionRef.current = null
      if (messageTimerRef.current) {
        clearTimeout(messageTimerRef.current)
        messageTimerRef.current = null
      }
    }

    fetchTokenInfo()
  }, [contractAddress, router, fetchTokenInfo])

  useEffect(() => {
    return () => {
      if (messageTimerRef.current) {
        clearTimeout(messageTimerRef.current)
        messageTimerRef.current = null
      }
    }
  }, [])

  const handleCopyCA = async () => {
    await navigator.clipboard.writeText(contractAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const ChangeIcon =
    tokenData && tokenData.change24h > 0 ? (
      <TrendingUp className="w-4 h-4" />
    ) : tokenData && tokenData.change24h < 0 ? (
      <TrendingDown className="w-4 h-4" />
    ) : (
      <Minus className="w-4 h-4" />
    )

  const ChangeColor =
    tokenData && tokenData.change24h > 0
      ? "text-green-400"
      : tokenData && tokenData.change24h < 0
        ? "text-red-400"
        : "text-muted-foreground"

  const connectionIcon = connectionStatus === "connected" ? (
    <Wifi className="w-4 h-4 text-green-400" />
  ) : connectionStatus === "connecting" ? (
    <Wifi className="w-4 h-4 text-yellow-400 animate-pulse" />
  ) : (
    <WifiOff className="w-4 h-4 text-red-400" />
  )

  const connectionText =
    connectionStatus === "connected"
      ? `Live (${updateCount} updates)`
      : connectionStatus === "connecting"
        ? "Connecting..."
        : "Disconnected"

  const tokenTitle = useMemo(() => {
    return tokenData?.name || tokenData?.symbol || "Token Info"
  }, [tokenData])

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/waifu">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground hidden sm:inline">Claude Waifu</span>
            </div>
          </div>

          <button
            onClick={handleCopyCA}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
          >
            <span className="text-sm font-mono text-muted-foreground">{truncateCA(contractAddress)}</span>
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
          </button>

          <div className="flex items-center gap-2">
            {connectionIcon}
            <span className="text-xs text-muted-foreground hidden sm:inline">{connectionText}</span>
            <Button
              onClick={fetchTokenInfo}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
              className="border-border text-foreground bg-transparent"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {!tokenData && !isRefreshing && (
          <div className="bg-card rounded-xl p-6 border border-border text-center">
            <p className="text-muted-foreground">No token data available. Please check the token address.</p>
          </div>
        )}
        {!tokenData && isRefreshing && (
          <div className="bg-card rounded-xl p-6 border border-border text-center">
            <p className="text-muted-foreground">Loading token data via Jupiter API...</p>
            <p className="text-xs text-muted-foreground mt-2">Token: {contractAddress}</p>
          </div>
        )}
        {tokenData && (
          <div className="mb-8 space-y-4">
            <div className="bg-card rounded-xl p-6 border border-border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">{tokenTitle}</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Address</div>
                  <div className="text-sm font-mono text-foreground break-all">{truncateCA(tokenData.address)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Supply</div>
                  <div className="text-sm font-bold text-foreground">{formatNumber(tokenData.supply)}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-card rounded-xl p-4 border border-border">
                <div className="text-sm text-muted-foreground mb-1">Price</div>
                <div className="text-xl font-bold text-foreground">
                  {tokenData.price > 0 ? `$${tokenData.price.toFixed(6)}` : "N/A"}
                </div>
              </div>
              <div className="bg-card rounded-xl p-4 border border-border">
                <div className="text-sm text-muted-foreground mb-1">Market Cap</div>
                <div className="text-xl font-bold text-foreground">
                  {tokenData.marketCap > 0 ? formatNumber(tokenData.marketCap) : "N/A"}
                </div>
              </div>
              <div className="bg-card rounded-xl p-4 border border-border">
                <div className="text-sm text-muted-foreground mb-1">24h Change</div>
                <div className={`text-xl font-bold flex items-center gap-1 ${ChangeColor}`}>
                  {ChangeIcon}
                  {tokenData.change24h > 0 ? "+" : ""}
                  {tokenData.change24h !== undefined ? tokenData.change24h.toFixed(2) : "0.00"}%
                </div>
              </div>
              <div className="bg-card rounded-xl p-4 border border-border">
                <div className="text-sm text-muted-foreground mb-1">24h Volume</div>
                <div className="text-xl font-bold text-foreground">
                  {tokenData.volume24h > 0 ? formatNumber(tokenData.volume24h) : "N/A"}
                </div>
              </div>
            </div>

            {tokenData.lastUpdated && (
              <div className="text-xs text-muted-foreground text-center">
                Last updated: {new Date(tokenData.lastUpdated).toLocaleTimeString()}
                {connectionStatus === "connected" && " • Real-time via Claude-Waifu RPC"}
              </div>
            )}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <WaifuDisplay emotion={emotion} change={tokenData?.change24h || 0} />
          <ChatMessages messages={messages} currentEmotion={emotion} tokenAddress={contractAddress} />
        </div>

        <div className="w-full">
          <MarketCapChart tokenAddress={contractAddress} externalData={chartData} />
        </div>
      </div>
    </div>
  )
}
