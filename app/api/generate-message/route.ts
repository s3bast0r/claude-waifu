import { NextRequest, NextResponse } from 'next/server'

/**
 * Generate chat message using OpenRouter API
 * Optimized prompts to save tokens
 */
export async function POST(request: NextRequest) {
  try {
    const { emotion, change24h, price, tokenSymbol } = await request.json()

    const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    // Short, optimized prompts to save tokens
    const emotionContext: Record<string, string> = {
      excited: "very excited, price up 20%+",
      happy: "happy, price up 5-20%",
      neutral: "neutral, price stable",
      worried: "worried, price down 5-15%",
      sad: "sad, price down 15-30%",
      angry: "angry, price down 30%+",
    }

    const context = emotionContext[emotion] || "neutral"
    const changeText = change24h > 0 ? `+${change24h.toFixed(2)}%` : `${change24h.toFixed(2)}%`
    const priceText = price > 0 ? `$${price.toFixed(6)}` : "unknown"

    // Very short system prompt
    const systemPrompt = "You are Claude-chan, an anime girl tracking crypto tokens. Reply in 1 sentence, max 20 words. Be cute and emotional."

    // Short user prompt
    const userPrompt = `Token: ${tokenSymbol || "token"}, Price: ${priceText}, Change: ${changeText}, Mood: ${context}. React briefly.`

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
        'X-Title': 'Claude Waifu',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini', // Cheaper model
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 30, // Very short responses
        temperature: 0.8,
      }),
    })

    if (!response.ok) {
      // Handle 402 (insufficient credits) silently - expected, will use fallback
      if (response.status === 402) {
        return NextResponse.json({ error: 'insufficient_credits' }, { status: 402 })
      }

      // For other errors, log and return error
      const errorText = await response.text()
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { error: { message: errorText } }
      }

      console.error('[OpenRouter] Error:', errorData)
      return NextResponse.json({ error: 'Failed to generate message', details: errorData }, { status: response.status })
    }

    const data = await response.json()
    const message = data.choices?.[0]?.message?.content?.trim()

    if (!message) {
      return NextResponse.json({ error: 'No message generated' }, { status: 500 })
    }

    return NextResponse.json({ message })
  } catch (error) {
    console.error('[OpenRouter] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

