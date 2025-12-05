import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { method, params } = await req.json()

    if (!method) {
      return NextResponse.json(
        { error: 'Method is required' },
        { status: 400 }
      )
    }

    const ALCHEMY_KEY = process.env.ALCHEMY_KEY
    if (!ALCHEMY_KEY) {
      return NextResponse.json(
        { error: 'ALCHEMY_KEY environment variable is not set' },
        { status: 500 }
      )
    }

    const alchemyUrl = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`

    const response = await fetch(alchemyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: method,
        params: params || [],
      }),
    })

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Alchemy API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch from Alchemy API', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

