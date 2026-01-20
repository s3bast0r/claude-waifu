/**
 * Token data client using our API routes
 * Uses /api/token-price which aggregates DexScreener, Jupiter, and Birdeye
 * 
 * All data fetching goes through our API routes for consistency
 */

export interface TokenData {
  // Basic token info
  address: string
  supply: number
  decimals: number
  
  // Market data
  price: number
  marketCap: number
  change24h: number
  volume24h: number
  
  // Metadata
  name?: string
  symbol?: string
  logoURI?: string
  
  // Real-time tracking
  lastUpdated?: number
}

export interface TokenStreamEvent {
  type: 'update' | 'refresh' | 'error' | 'connected' | 'keepalive'
  data?: Partial<TokenData>
  message?: string
  token?: string
}

// Cache for token metadata
let tokenMetadataCache: Map<string, { name?: string; symbol?: string; logoURI?: string }> = new Map()
let tokenListLoaded = false

/**
 * Load token metadata from Jupiter Token List
 */
async function loadTokenMetadata(tokenAddress: string): Promise<{ name?: string; symbol?: string; logoURI?: string }> {
  // Check cache first
  if (tokenMetadataCache.has(tokenAddress)) {
    return tokenMetadataCache.get(tokenAddress)!
  }

  // Skip token metadata loading - Jupiter API requires auth
  // Metadata is optional and not critical for functionality
  // We'll just return empty metadata

  return tokenMetadataCache.get(tokenAddress) || {}
}

/**
 * Get comprehensive token data via our API routes
 * Uses /api/token-price which handles DexScreener, Jupiter, Birdeye
 */
export async function fetchTokenData(tokenAddress: string): Promise<TokenData | null> {
  try {
    // 1. Get price and market data from our API route
    const priceResponse = await fetch(`/api/token-price?address=${tokenAddress}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(10000)
    })

    if (!priceResponse.ok) {
      return null
    }

    const priceData = await priceResponse.json()

    if (!priceData.success || priceData.price === 0) {
      return null
    }

    const price = parseFloat(priceData.price) || 0
    const change24h = parseFloat(priceData.change24h) || 0
    const volume24h = parseFloat(priceData.volume24h) || 0
    const apiSymbol = typeof priceData.tokenSymbol === 'string' ? priceData.tokenSymbol : undefined
    const apiName = typeof priceData.tokenName === 'string' ? priceData.tokenName : undefined
    
    // 2. Get supply and additional data from DexScreener
    let supply = 0
    let decimals = 9
    
    try {
      const dexScreenerUrl = `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`
      const dexResponse = await fetch(dexScreenerUrl, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(5000)
      })
      
      if (dexResponse.ok) {
        const dexData = await dexResponse.json()
        if (dexData?.pairs && dexData.pairs.length > 0) {
          const bestPair = dexData.pairs.sort((a: any, b: any) => 
            (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
          )[0]
          
          // Calculate supply from FDV (Fully Diluted Valuation) or market cap
          if (bestPair.fdv && price > 0) {
            supply = bestPair.fdv / price
          } else if (bestPair.marketCap && price > 0) {
            supply = bestPair.marketCap / price
          }
        }
      }
    } catch (e) {
      // Supply is optional, continue without it
    }

    // 3. Get token metadata
    const metadata = await loadTokenMetadata(tokenAddress)

    // 4. Calculate market cap
    const marketCap = price > 0 && supply > 0 ? price * supply : 0

    const result: TokenData = {
      address: tokenAddress,
      supply,
      decimals,
      price,
      marketCap,
      change24h,
      volume24h,
      name: apiName || metadata.name,
      symbol: apiSymbol || metadata.symbol,
      logoURI: metadata.logoURI,
      lastUpdated: Date.now(),
    }

    return result
  } catch (error) {
    console.error('[Token Client] Error fetching token data:', error)
    return null
  }
}

/**
 * Create SSE connection for real-time token updates
 * Polls our API every 5 seconds
 */
export function createTokenSSEStream(
  tokenAddress: string,
  onUpdate: (data: Partial<TokenData>) => void,
  onError?: (error: Error) => void,
  onConnected?: () => void
): () => void {
  let eventSource: EventSource | null = null
  let isClosed = false
  let reconnectTimeout: NodeJS.Timeout | null = null
  let reconnectAttempts = 0
  const maxReconnectAttempts = 10

  const connect = () => {
    if (isClosed) return

    try {
      const url = `/api/ws-token?token=${encodeURIComponent(tokenAddress)}`
      eventSource = new EventSource(url)

      eventSource.onopen = () => {
        reconnectAttempts = 0
      }

      eventSource.onmessage = (event) => {
        if (isClosed) return

        try {
          const data: TokenStreamEvent = JSON.parse(event.data)

          switch (data.type) {
            case 'connected':
              if (onConnected) onConnected()
              break

            case 'update':
              if (data.data) {
                onUpdate(data.data)
              }
              break

            case 'refresh':
              fetchTokenData(tokenAddress).then(fullData => {
                if (fullData) onUpdate(fullData)
              }).catch(() => {})
              break

            case 'error':
              if (onError) onError(new Error(data.message || 'Server error'))
              break

            case 'keepalive':
              break
          }
        } catch (e) {
          // Parse error, ignore
        }
      }

      eventSource.onerror = () => {
        if (eventSource?.readyState === EventSource.CLOSED) {
          eventSource = null
          
          if (!isClosed) {
            reconnectAttempts++
            if (reconnectAttempts <= maxReconnectAttempts) {
              const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000)
              reconnectTimeout = setTimeout(connect, delay)
            } else {
              if (onError) onError(new Error('Max reconnect attempts reached'))
            }
          }
        }
      }
    } catch (error) {
      if (onError) onError(error as Error)
    }
  }

  connect()

  return () => {
    isClosed = true
    if (reconnectTimeout) clearTimeout(reconnectTimeout)
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
  }
}

/**
 * Create real-time stream for token updates
 * Uses SSE with polling every 5 seconds
 */
export function createTokenRealtimeStream(
  tokenAddress: string,
  onUpdate: (data: Partial<TokenData>) => void,
  onError?: (error: Error) => void,
  onConnected?: () => void
): () => void {
  return createTokenSSEStream(tokenAddress, onUpdate, onError, onConnected)
}
