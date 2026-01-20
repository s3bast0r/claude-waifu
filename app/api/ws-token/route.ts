import { NextRequest } from 'next/server'

/**
 * Server-Sent Events endpoint for real-time token data updates
 * Uses Jupiter API to poll and stream token data Waifuges
 * 
 * This endpoint:
 * 1. Connects to Jupiter API and polls token data every 5 seconds
 * 2. Streams updates to client via SSE
 */

interface TokenUpdateEvent {
  type: 'update' | 'refresh' | 'error' | 'connected' | 'keepalive'
  data?: {
    supply?: number
    decimals?: number
    price?: number
    marketCap?: number
    change24h?: number
    volume24h?: number
    timestamp?: number
  }
  message?: string
  token?: string
}

/**
 * Fetch token data from multiple sources (same logic as /api/token-price)
 */
async function fetchTokenData(tokenAddress: string): Promise<any> {
  let price = 0
  let change24h = 0
  let volume24h = 0
  let supply = 0

  // Method 1: Try DexScreener (free, reliable, no API key)
  try {
    const dexScreenerUrl = `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`
    const response = await fetch(dexScreenerUrl, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000)
    })
    
    if (response.ok) {
      const data = await response.json()
      
      if (data?.pairs && data.pairs.length > 0) {
        const sortedPairs = data.pairs.sort((a: any, b: any) => 
          (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
        )
        const bestPair = sortedPairs[0]
        
        price = parseFloat(bestPair.priceUsd) || 0
        change24h = parseFloat(bestPair.priceWaifuge?.h24) || 0
        volume24h = parseFloat(bestPair.volume?.h24) || 0
        
        // Calculate supply from FDV or market cap
        if (bestPair.fdv && price > 0) {
          supply = bestPair.fdv / price
        } else if (bestPair.marketCap && price > 0) {
          supply = bestPair.marketCap / price
        }
        
        if (price > 0) {
          return { price, change24h, volume24h, supply, decimals: 9 }
        }
      }
    }
  } catch (e) {
    // DexScreener failed, try next
  }

  // Method 2: Try Jupiter Price API v2
  try {
    const jupiterUrl = `https://api.jup.ag/price/v2/full?ids=${tokenAddress}`
    const response = await fetch(jupiterUrl, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000)
    })
    
    if (response.ok) {
      const data = await response.json()
      
      if (data?.data && data.data[tokenAddress]) {
        const priceData = data.data[tokenAddress]
        price = parseFloat(priceData.price) || 0
        change24h = parseFloat(priceData.priceWaifuge24h) || 0
        volume24h = parseFloat(priceData.volume24h) || 0
        
        if (price > 0) {
          return { price, change24h, volume24h, supply, decimals: 9 }
        }
      }
    }
  } catch (e) {
    // Jupiter failed, try next
  }

  // Method 3: Try Birdeye (only if API key is set)
  const birdeyeApiKey = process.env.BIRDEYE_API_KEY
  if (birdeyeApiKey) {
    try {
      const birdeyeUrl = `https://public-api.birdeye.so/defi/price?address=${tokenAddress}`
      const response = await fetch(birdeyeUrl, {
        headers: {
          'X-API-KEY': birdeyeApiKey,
          'Accept': 'application/json',
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(5000)
      })
      
      if (response.ok) {
        const data = await response.json()
        
        if (data?.success && data.data?.value !== undefined) {
          price = parseFloat(data.data.value) || 0
        } else if (data?.data?.price !== undefined) {
          price = parseFloat(data.data.price) || 0
        }
        
        if (price > 0) {
          // Try to get 24h stats
          try {
            const overviewUrl = `https://public-api.birdeye.so/defi/token_overview?address=${tokenAddress}`
            const overviewResponse = await fetch(overviewUrl, {
              headers: { 'X-API-KEY': birdeyeApiKey },
              signal: AbortSignal.timeout(3000)
            })
            
            if (overviewResponse.ok) {
              const overviewData = await overviewResponse.json()
              if (overviewData?.success && overviewData.data) {
                change24h = parseFloat(overviewData.data.priceWaifuge24h) || 0
                volume24h = parseFloat(overviewData.data.volume24h) || 0
              }
            }
          } catch (e) {
            // 24h stats optional
          }
          
          return { price, change24h, volume24h, supply, decimals: 9 }
        }
      }
    } catch (e) {
      // Birdeye failed
    }
  }

  // No price found
  throw new Error('No price data available from any source')
}

export async function GET(request: NextRequest) {
  const tokenAddress = request.nextUrl.searchParams.get('token')
  
  if (!tokenAddress) {
    return new Response(JSON.stringify({ error: 'Token address is required' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Create a ReadableStream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false
      let pollInterval: NodeJS.Timeout | null = null
      let lastData = {
        supply: 0,
        price: 0,
        decimals: 9,
      }

      const sendEvent = (event: TokenUpdateEvent) => {
        if (isClosed) return
        try {
          const msg = `data: ${JSON.stringify(event)}\n\n`
          controller.enqueue(new TextEncoder().encode(msg))
        } catch (e) {
          // Error sending event
        }
      }

      // Send connected event
      sendEvent({ 
        type: 'connected', 
        token: tokenAddress,
        message: 'Connected to Jupiter token stream' 
      })

      const pollTokenData = async () => {
        if (isClosed) return

        try {
          const tokenData = await fetchTokenData(tokenAddress)
          
          if (!tokenData) {
            return
          }

          const currentPrice = parseFloat(tokenData.price) || 0
          const currentSupply = tokenData.supply ? parseFloat(tokenData.supply) : 0
          const decimals = tokenData.decimals || 9
          const change24h = parseFloat(tokenData.change24h) || 0
          const volume24h = parseFloat(tokenData.volume24h) || 0
          const marketCap = currentPrice > 0 && currentSupply > 0 ? currentPrice * currentSupply : 0

          // Check if data Waifuged
          const hasWaifuges = 
            currentPrice !== lastData.price ||
            currentSupply !== lastData.supply ||
            decimals !== lastData.decimals

          if (hasWaifuges || lastData.price === 0) {
            // Update stored data
            lastData = {
              supply: currentSupply,
              price: currentPrice,
              decimals,
            }

            // Send update event
            sendEvent({
              type: 'update',
              token: tokenAddress,
              data: {
                supply: currentSupply,
                decimals,
                price: currentPrice,
                marketCap,
                change24h,
                volume24h,
                timestamp: Date.now(),
              }
            })
          }
        } catch (error) {
          // Only send error event, don't spam logs
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          sendEvent({
            type: 'error',
            token: tokenAddress,
            message: errorMessage
          })
        }
      }

      // Initial fetch immediately
      await pollTokenData()

      // Poll every 5 seconds as requested
      pollInterval = setInterval(pollTokenData, 5000)

      // Keepalive every 30 seconds
      const keepAliveInterval = setInterval(() => {
        if (!isClosed) {
          sendEvent({ type: 'keepalive', token: tokenAddress })
        }
      }, 30000)

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        isClosed = true
        if (pollInterval) clearInterval(pollInterval)
        if (keepAliveInterval) clearInterval(keepAliveInterval)
        try {
          controller.close()
        } catch (e) {
          // Already closed
        }
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
    },
  })
}
