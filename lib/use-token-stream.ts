"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchTokenData, createTokenRealtimeStream, type TokenData } from './jupiter-client'

export interface UseTokenStreamOptions {
  /** Enable/disable auto-refresh on initial load */
  autoFetch?: boolean
  /** Enable/disable real-time streaming */
  enableStream?: boolean
  /** Debounce updates (ms) - default 500 */
  debounceMs?: number
  /** Callback on token data update */
  onUpdate?: (data: TokenData) => void
  /** Callback on error */
  onError?: (error: Error) => void
}

export interface UseTokenStreamResult {
  /** Current token data */
  tokenData: TokenData | null
  /** Loading state for initial fetch */
  isLoading: boolean
  /** Refreshing state for manual refresh */
  isRefreshing: boolean
  /** Connection status */
  connectionStatus: 'connecting' | 'connected' | 'disconnected'
  /** Number of real-time updates received */
  updateCount: number
  /** Error if any */
  error: Error | null
  /** Manually refresh token data */
  refresh: () => Promise<void>
}

/**
 * React hook for real-time token data streaming 
 * 
 * Features:
 * - Automatic initial data fetch
 * - Real-time updates via SSE + WebSocket
 * - Debounced updates for performance
 * - Connection status tracking
 * - Manual refresh capability
 * 
 * @example
 * ```tsx
 * const { tokenData, connectionStatus, refresh } = useTokenStream(tokenAddress, {
 *   onUpdate: (data) => console.log('Token updated:', data)
 * })
 * ```
 */
export function useTokenStream(
  tokenAddress: string | null,
  options: UseTokenStreamOptions = {}
): UseTokenStreamResult {
  const {
    autoFetch = true,
    enableStream = true,
    debounceMs = 500,
    onUpdate,
    onError,
  } = options

  const [tokenData, setTokenData] = useState<TokenData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected')
  const [updateCount, setUpdateCount] = useState(0)
  const [error, setError] = useState<Error | null>(null)

  // Refs for debouncing and callbacks
  const lastUpdateRef = useRef<number>(0)
  const onUpdateRef = useRef(onUpdate)
  const onErrorRef = useRef(onError)

  // Keep refs in sync
  useEffect(() => {
    onUpdateRef.current = onUpdate
    onErrorRef.current = onError
  }, [onUpdate, onError])

  // Handle real-time updates with debouncing
  const handleRealtimeUpdate = useCallback((updatedData: Partial<TokenData>) => {
    const now = Date.now()
    if (now - lastUpdateRef.current < debounceMs) {
      return
    }
    lastUpdateRef.current = now

    setUpdateCount(prev => prev + 1)

    setTokenData((prev) => {
      if (!prev) {
        if (updatedData.address && updatedData.supply !== undefined) {
          const newData = updatedData as TokenData
          if (onUpdateRef.current) onUpdateRef.current(newData)
          return newData
        }
        return null
      }

      const merged: TokenData = { ...prev, ...updatedData }

      // Recalculate market cap
      if (merged.price > 0 && merged.supply > 0) {
        merged.marketCap = merged.price * merged.supply
      }

      if (onUpdateRef.current) onUpdateRef.current(merged)
      return merged
    })
  }, [debounceMs])

  // Refresh function
  const refresh = useCallback(async () => {
    if (!tokenAddress) return

    setIsRefreshing(true)
    setError(null)

    try {
      const data = await fetchTokenData(tokenAddress)
      if (data) {
        setTokenData(data)
        if (onUpdateRef.current) onUpdateRef.current(data)
      } else {
        setError(new Error('Failed to fetch token data'))
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      if (onErrorRef.current) onErrorRef.current(error)
    } finally {
      setIsRefreshing(false)
    }
  }, [tokenAddress])

  // Initial fetch
  useEffect(() => {
    if (!tokenAddress || !autoFetch) {
      setTokenData(null)
      setConnectionStatus('disconnected')
      return
    }

    setIsLoading(true)
    setError(null)

    const loadInitialData = async () => {
      try {
        const data = await fetchTokenData(tokenAddress)
        if (data) {
          setTokenData(data)
          if (onUpdateRef.current) onUpdateRef.current(data)
        } else {
          setError(new Error('Failed to fetch token data'))
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        setError(error)
        if (onErrorRef.current) onErrorRef.current(error)
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialData()
  }, [tokenAddress, autoFetch])

  // Real-time stream setup
  useEffect(() => {
    if (!tokenAddress || !enableStream) {
      setConnectionStatus('disconnected')
      return
    }

    setConnectionStatus('connecting')

    const cleanup = createTokenRealtimeStream(
      tokenAddress,
      handleRealtimeUpdate,
      (err) => {
        setConnectionStatus('disconnected')
        setError(err)
        if (onErrorRef.current) onErrorRef.current(err)
      },
      () => {
        setConnectionStatus('connected')
      }
    )

    return () => {
      cleanup()
      setConnectionStatus('disconnected')
    }
  }, [tokenAddress, enableStream, handleRealtimeUpdate])

  // Reset state when token Waifuges
  useEffect(() => {
    return () => {
      setTokenData(null)
      setUpdateCount(0)
      setError(null)
    }
  }, [tokenAddress])

  return {
    tokenData,
    isLoading,
    isRefreshing,
    connectionStatus,
    updateCount,
    error,
    refresh,
  }
}

export default useTokenStream

