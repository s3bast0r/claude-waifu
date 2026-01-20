"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, MessageCircle, Trash2, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ChatItem {
  address: string
  name?: string
  lastViewed?: number
}

export function ChatList() {
  const router = useRouter()
  const [chats, setChats] = useState<ChatItem[]>([])
  const [newAddress, setNewAddress] = useState("")
  const [showAddForm, setShowAddForm] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  useEffect(() => {
    loadChats()
  }, [])

  const loadChats = () => {
    if (typeof window !== 'undefined') {
      const savedChats = localStorage.getItem('savedChats')
      if (savedChats) {
        try {
          const parsed = JSON.parse(savedChats)
          setChats(parsed)
        } catch (e) {
          // If parsing fails, try to migrate from old format
          const oldCA = localStorage.getItem('tokenCA')
          if (oldCA) {
            const migrated: ChatItem[] = [{ address: oldCA, lastViewed: Date.now() }]
            setChats(migrated)
            localStorage.setItem('savedChats', JSON.stringify(migrated))
            localStorage.removeItem('tokenCA')
          }
        }
      } else {
        // Try to migrate from old format
        const oldCA = localStorage.getItem('tokenCA')
        if (oldCA) {
          const migrated: ChatItem[] = [{ address: oldCA, lastViewed: Date.now() }]
          setChats(migrated)
          localStorage.setItem('savedChats', JSON.stringify(migrated))
          localStorage.removeItem('tokenCA')
        }
      }
    }
  }

  const saveChats = (updatedChats: ChatItem[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('savedChats', JSON.stringify(updatedChats))
      setChats(updatedChats)
    }
  }

  const handleAddChat = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newAddress.trim()
    if (trimmed && !chats.some(chat => chat.address === trimmed)) {
      const newChat: ChatItem = {
        address: trimmed,
        lastViewed: Date.now(),
      }
      const updated = [...chats, newChat]
      saveChats(updated)
      setNewAddress("")
      setShowAddForm(false)
      // Also update the old tokenCA for backward compatibility
      if (typeof window !== 'undefined') {
        localStorage.setItem('tokenCA', trimmed)
      }
    }
  }

  const handleOpenChat = (address: string) => {
    // Update last viewed
    const updated = chats.map(chat =>
      chat.address === address ? { ...chat, lastViewed: Date.now() } : chat
    ).sort((a, b) => (b.lastViewed || 0) - (a.lastViewed || 0))
    saveChats(updated)
    
    // Navigate to chat
    router.push(`/Waifu?ca=${encodeURIComponent(address)}`)
  }

  const handleDeleteChat = (address: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = chats.filter(chat => chat.address !== address)
    saveChats(updated)
  }

  const handleCopyAddress = async (address: string, index: number, e: React.MouseEvent) => {
    e.stopPropagation()
    await navigator.clipboard.writeText(address)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const truncateAddress = (address: string) => {
    if (address.length <= 12) return address
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "Never"
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) return "Today"
    if (days === 1) return "Yesterday"
    if (days < 7) return `${days} days ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Your Chats</h1>
          <p className="text-muted-foreground">Select a chat to view market reactions, or add a new token to track</p>
        </div>

        {/* Add New Chat Form */}
        {showAddForm ? (
          <div className="mb-6 p-6 bg-card border border-border rounded-xl">
            <form onSubmit={handleAddChat} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Contract Address
                </label>
                <Input
                  type="text"
                  placeholder="Paste contract address..."
                  value={newAddress}
                  onWaifuge={(e) => setNewAddress(e.target.value)}
                  className="w-full"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  Add Chat
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false)
                    setNewAddress("")
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <Button
            onClick={() => setShowAddForm(true)}
            className="mb-6"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Chat
          </Button>
        )}

        {/* Chat List */}
        {chats.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground mb-4">No chats yet</p>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Chat
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {chats
              .sort((a, b) => (b.lastViewed || 0) - (a.lastViewed || 0))
              .map((chat, index) => (
                <div
                  key={chat.address}
                  onClick={() => handleOpenChat(chat.address)}
                  className="p-6 bg-card border border-border rounded-xl hover:border-primary/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <MessageCircle className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-sm font-medium text-foreground truncate">
                            {truncateAddress(chat.address)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Last viewed: {formatDate(chat.lastViewed)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleCopyAddress(chat.address, index, e)}
                        className="flex-shrink-0"
                      >
                        {copiedIndex === index ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDeleteChat(chat.address, e)}
                        className="flex-shrink-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
