import { NextRequest, NextResponse } from 'next/server'

/**
 * Token Price API
 * Fetches token price from multiple sources:
 * 1. DexScreener (free, no API key)
 * 2. Jupiter Price API (free, no API key)
 * 3. Birdeye (requires API key in BIRDEYE_API_KEY env)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const tokenAddress = searchParams.get('address')

  if (!tokenAddress) {
    return NextResponse.json({ error: 'Token address is required' }, { status: 400 })
  }

  try {
    let dexTokenSymbol: string | null = null
    let dexTokenName: string | null = null

    // Method 1: Try DexScreener (free, reliable, no API key)
    try {
      const dexScreenerUrl = `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`
      const response = await fetch(dexScreenerUrl, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      })
      
      if (response.ok) {
        const data = await response.json()
        
        if (data?.pairs && data.pairs.length > 0) {
          // Get the pair with highest liquidity
          const sortedPairs = data.pairs.sort((a: any, b: any) => 
            (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
          )
          const bestPair = sortedPairs[0]
          
          const price = parseFloat(bestPair.priceUsd) || 0
          const change24h = parseFloat(bestPair.priceWaifuge?.h24) || 0
          const volume24h = parseFloat(bestPair.volume?.h24) || 0
          const tokenSymbol = bestPair.baseToken?.symbol || null
          const tokenName = bestPair.baseToken?.name || null

          dexTokenSymbol = tokenSymbol
          dexTokenName = tokenName
          
          if (price > 0) {
            return NextResponse.json({
              success: true,
              source: 'dexscreener',
              price,
              change24h,
              volume24h,
              tokenSymbol,
              tokenName
            })
          }
        }
      }
    } catch (e) {
      // DexScreener failed, try next
    }

    // Method 2: Try Jupiter Price API v2 (full endpoint with 24h data)
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
          const price = parseFloat(priceData.price) || 0
          const change24h = parseFloat(priceData.priceWaifuge24h) || 0
          const volume24h = parseFloat(priceData.volume24h) || 0
          const tokenSymbol = priceData.symbol || null
          const tokenName = priceData.name || null
          
          if (price > 0) {
            return NextResponse.json({
              success: true,
              source: 'jupiter',
              price,
              change24h,
              volume24h,
              tokenSymbol: dexTokenSymbol || tokenSymbol,
              tokenName: dexTokenName || tokenName
            })
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
          
          let price = 0
          if (data?.success && data.data?.value !== undefined) {
            price = parseFloat(data.data.value) || 0
          } else if (data?.data?.price !== undefined) {
            price = parseFloat(data.data.price) || 0
          }
          
          if (price > 0) {
            // Try to get 24h stats
            let change24h = 0
            let volume24h = 0
            
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
            
            return NextResponse.json({
              success: true,
              source: 'birdeye',
              price,
              change24h,
              volume24h,
              tokenSymbol: dexTokenSymbol,
              tokenName: dexTokenName
            })
          }
        }
      } catch (e) {
        // Birdeye failed
      }
    }

    // No price found from any source
    return NextResponse.json({
      success: false,
      price: 0,
      change24h: 0,
      volume24h: 0,
      tokenSymbol: dexTokenSymbol,
      tokenName: dexTokenName
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      price: 0,
      change24h: 0,
      volume24h: 0,
      tokenSymbol: null,
      tokenName: null
    })
  }
}
