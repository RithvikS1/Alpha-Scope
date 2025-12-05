import { NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface Transaction {
  value: string | number;
  metadata?: {
    blockTimestamp?: string | number | Date;
  };
}

function analyzeTradingPattern(transactions: Transaction[]) {
  const volumes = transactions.map(tx => parseFloat(tx.value))
  const timestamps = transactions.map(tx => new Date(tx.metadata.blockTimestamp))
  
  // Calculate basic statistics
  const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length
  const maxVolume = Math.max(...volumes)
  const minVolume = Math.min(...volumes)
  
  // Analyze time patterns
  const hourCounts = new Array(24).fill(0)
  timestamps.forEach(time => {
    hourCounts[time.getHours()]++
  })
  const mostActiveHour = hourCounts.indexOf(Math.max(...hourCounts))
  
  // Analyze volume patterns
  const volumeIncreases = volumes.slice(1).map((vol, i) => vol > volumes[i])
  const buyingDips = volumeIncreases.filter(v => v).length / volumeIncreases.length > 0.6
  
  return {
    avgVolume,
    maxVolume,
    minVolume,
    mostActiveHour,
    buyingDips,
  }
}

export async function POST(req: Request) {
  try {
    const { transactions } = await req.json()
    
    if (!transactions || !Array.isArray(transactions)) {
      return NextResponse.json(
        { error: "Invalid transactions data" },
        { status: 400 }
      )
    }

    const pattern = analyzeTradingPattern(transactions)
    
    const prompt = `Based on the following trading pattern analysis, generate a PineScript v5 strategy:
    - Average transaction volume: ${pattern.avgVolume} ETH
    - Maximum transaction: ${pattern.maxVolume} ETH
    - Minimum transaction: ${pattern.minVolume} ETH
    - Most active trading hour: ${pattern.mostActiveHour}:00 UTC
    - Tendency to buy dips: ${pattern.buyingDips ? "Yes" : "No"}
    
    Generate a complete PineScript v5 strategy that matches this trading behavior. Include:
    1. Appropriate indicators (RSI, EMA, Volume)
    2. Entry and exit conditions
    3. Position sizing
    4. Risk management rules
    The strategy should be ready to copy-paste into TradingView.`

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are an expert crypto trading strategy developer who specializes in PineScript v5. Generate complete, working strategies based on wallet analysis.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
    })

    const strategy = completion.choices[0].message.content

    return NextResponse.json({ strategy })
  } catch (error) {
    console.error("Strategy generation error:", error)
    return NextResponse.json(
      { error: "Failed to generate strategy" },
      { status: 500 }
    )
  }
} 