import { NextRequest, NextResponse } from 'next/server'

/**
 * Chart Data API
 * Fetches token data from DexScreener for chart display
 * This route prevents CORS issues by proxying requests from the server
 * 
 * Rate limiting: Caches responses for 5 seconds to prevent 429 errors
 */

// Simple in-memory cache with TTL
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5000 // 5 seconds

function getCachedData(tokenAddress: string) {
  const cached = cache.get(tokenAddress)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }
  return null
}

function setCachedData(tokenAddress: string, data: any) {
  cache.set(tokenAddress, { data, timestamp: Date.now() })
  
  // Clean up old cache entries (keep last 100)
  if (cache.size > 100) {
    const entries = Array.from(cache.entries())
    entries.sort((a, b) => b[1].timestamp - a[1].timestamp)
    cache.clear()
    entries.slice(0, 100).forEach(([key, value]) => cache.set(key, value))
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const tokenAddress = searchParams.get('address')

  if (!tokenAddress) {
    return NextResponse.json({ error: 'Token address is required' }, { status: 400 })
  }

  // Check cache first
  const cached = getCachedData(tokenAddress)
  if (cached) {
    return NextResponse.json(cached)
  }

  try {
    const dexScreenerUrl = `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`
    const response = await fetch(dexScreenerUrl, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })

    if (!response.ok) {
      // If 429, return cached data if available, otherwise return error
      if (response.status === 429) {
        const staleCache = cache.get(tokenAddress)
        if (staleCache) {
          // Return stale cache with a warning
          return NextResponse.json({
            ...staleCache.data,
            cached: true,
            warning: 'Rate limited, returning cached data'
          })
        }
        return NextResponse.json(
          { error: 'Too many requests. Please wait a moment.' },
          { status: 429 }
        )
      }
      return NextResponse.json(
        { error: `DexScreener API error: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()

    if (!data?.pairs || data.pairs.length === 0) {
      return NextResponse.json({ error: 'No pairs found' }, { status: 404 })
    }

    // Get the pair with highest liquidity
    const sortedPairs = data.pairs.sort((a: any, b: any) => 
      (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
    )
    const bestPair = sortedPairs[0]

    const currentPrice = parseFloat(bestPair.priceUsd) || 0
    const priceChange24h = parseFloat(bestPair.priceChange?.h24) || 0
    const volume24h = parseFloat(bestPair.volume?.h24) || 0

    if (currentPrice === 0) {
      return NextResponse.json({ error: 'Invalid price data' }, { status: 400 })
    }

    const result = {
      success: true,
      price: currentPrice,
      priceChange24h,
      volume24h,
      pairAddress: bestPair.pairAddress,
      pairData: bestPair,
    }

    // Cache the result
    setCachedData(tokenAddress, result)

    return NextResponse.json(result)
  } catch (error) {
    // On error, try to return cached data
    const staleCache = cache.get(tokenAddress)
    if (staleCache) {
      return NextResponse.json({
        ...staleCache.data,
        cached: true,
        warning: 'Error fetching fresh data, returning cached data'
      })
    }

    console.error('[Chart Data API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch chart data' },
      { status: 500 }
    )
  }
}

