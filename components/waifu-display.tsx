"use client"

import { useState, useEffect } from "react"
import type { Emotion } from "./waifu-tracker"

interface WaifuDisplayProps {
  emotion: Emotion
  change: number
}

// Multiple variants for each emotion
const EMOTION_IMAGES: Record<Emotion, string[]> = {
  excited: ["/claude/happy.png", "/claude/happy2.png"],
  happy: ["/claude/happy.png", "/claude/happy2.png"],
  neutral: ["/claude/basic.png", "/claude/chill.png"],
  worried: ["/claude/think.png"],
  sad: ["/claude/sad.png", "/claude/cry.png", "/claude/cry2.png"],
  angry: ["/claude/angry.png", "/claude/angry0.png", "/claude/angry2.png"],
}

const EMOTION_LABELS: Record<Emotion, string> = {
  excited: "TO THE MOON! 🚀",
  happy: "Feeling bullish 💚",
  neutral: "Watching the market",
  worried: "Getting nervous 😰",
  sad: "Down bad 😢",
  angry: "WHO DUMPED?! 😤",
}

const EMOTION_COLORS: Record<Emotion, string> = {
  excited: "from-yellow-500/20 to-orange-500/20",
  happy: "from-green-500/20 to-emerald-500/20",
  neutral: "from-primary/10 to-primary/5",
  worried: "from-yellow-600/20 to-amber-500/20",
  sad: "from-blue-500/20 to-indigo-500/20",
  angry: "from-red-500/20 to-rose-500/20",
}

export function WaifuDisplay({ emotion, change }: WaifuDisplayProps) {
  const [imageVariant, setImageVariant] = useState(0)
  
  // Change image variant every 5 seconds
  useEffect(() => {
    const variants = EMOTION_IMAGES[emotion]
    if (variants.length <= 1) return

    const interval = setInterval(() => {
      setImageVariant((prev) => (prev + 1) % variants.length)
    }, 5000) // Change variant every 5 seconds

    return () => clearInterval(interval)
  }, [emotion])

  // Reset variant when emotion changes
  useEffect(() => {
    setImageVariant(0)
  }, [emotion])

  const variants = EMOTION_IMAGES[emotion]
  const currentImage = variants[imageVariant] || variants[0] || "/placeholder.svg"

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden h-[560px] flex flex-col">
      <div className="p-6 flex flex-col h-full">
        {/* Status */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                change > 0 ? "bg-green-400" : change < 0 ? "bg-red-400" : "bg-muted-foreground"
              } animate-pulse`}
            />
            <span className="text-sm text-muted-foreground">Live reaction</span>
          </div>
          <span className="text-sm font-medium text-foreground">{EMOTION_LABELS[emotion]}</span>
        </div>

        {/* Waifu Image */}
        <div
          className={`relative flex-1 rounded-xl overflow-hidden bg-gradient-to-br ${EMOTION_COLORS[emotion]} flex items-center justify-center p-4`}
        >
          <img
            src={currentImage}
            alt={`Waifu feeling ${emotion}`}
            className="w-full h-full object-contain transition-all duration-500"
            key={`${emotion}-${imageVariant}`} // Force re-render on variant change
          />

          {/* Overlay effects based on emotion */}
          {emotion === "excited" && (
            <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/10 to-transparent pointer-events-none" />
          )}
          {emotion === "sad" && (
            <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-transparent pointer-events-none" />
          )}
        </div>

        {/* Emotion description */}
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            {emotion === "excited" && "She can barely contain her excitement!"}
            {emotion === "happy" && "She's pleased with the green candles."}
            {emotion === "neutral" && "She's patiently watching the charts."}
            {emotion === "worried" && "She's getting a bit anxious..."}
            {emotion === "sad" && "She's feeling the weight of the dip."}
            {emotion === "angry" && "She's not happy about this dump!"}
          </p>
        </div>
      </div>
    </div>
  )
}
