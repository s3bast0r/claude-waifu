"use client"

import { Suspense, useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { WaifuTracker } from "@/components/waifu-tracker"
import { ChatList } from "@/components/chat-list"

function WaifuPageContent() {
  const searchParams = useSearchParams()
  const contractAddress = searchParams.get("ca")
  const [hasAddress, setHasAddress] = useState(false)

  useEffect(() => {
    setHasAddress(!!contractAddress)
  }, [contractAddress])

  if (hasAddress) {
    return <WaifuTracker />
  }

  return <ChatList />
}

export default function WaifuPage() {
  return (
    <Suspense fallback={<WaifuLoadingState />}>
      <WaifuPageContent />
    </Suspense>
  )
}

function WaifuLoadingState() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  )
}
