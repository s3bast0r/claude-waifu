"use client"

import { useEffect, useRef } from "react"
import type { Emotion } from "./waifu-tracker"

interface Message {
  text: string
  emotion: Emotion
  timestamp: Date
}

interface ChatMessagesProps {
  messages: Message[]
  currentEmotion: Emotion
  tokenAddress?: string
}

const EMOTION_BUBBLE_COLORS: Record<Emotion, string> = {
  excited: "bg-yellow-500/10 border-yellow-500/30",
  happy: "bg-green-500/10 border-green-500/30",
  neutral: "bg-primary/10 border-primary/30",
  worried: "bg-amber-500/10 border-amber-500/30",
  sad: "bg-blue-500/10 border-blue-500/30",
  angry: "bg-red-500/10 border-red-500/30",
}

export function ChatMessages({ messages, currentEmotion, tokenAddress }: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden flex flex-col h-[560px]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center gap-3 flex-shrink-0">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-secondary">
          <img src="/claude/hello.png" alt="Waifu avatar" className="w-full h-full object-cover scale-110 object-center" />
        </div>
        <div>
          <div className="font-semibold text-foreground">Claude-Waifu</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            Watching your token
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 chat-scroll">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            Waiting for market updates...
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={index} className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-secondary flex-shrink-0">
                <img src="/claude/hello.png" alt="Waifu" className="w-full h-full object-cover scale-110 object-center" />
              </div>
              <div className="flex-1">
                <div
                  className={`inline-block px-4 py-3 rounded-2xl rounded-tl-md border ${EMOTION_BUBBLE_COLORS[message.emotion]}`}
                >
                  <p className="text-foreground text-sm">{message.text}</p>
                </div>
                <div className="text-xs text-muted-foreground mt-1 ml-1">{formatTime(message.timestamp)}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input hint */}
      <div className="px-6 py-4 border-t border-border bg-secondary/30 flex-shrink-0">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span>She reacts automatically to market changes...</span>
        </div>
      </div>
    </div>
  )
}
