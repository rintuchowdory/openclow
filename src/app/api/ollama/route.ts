import { NextRequest, NextResponse } from 'next/server'

const OLLAMA_BASE_URL = process.env.OLLAMA_API_URL || 'https://api.ollama.ai'
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY || ''

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OLLAMA_API_KEY}`
      },
      body: JSON.stringify(body)
    })

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      headers: { 
        'Authorization': `Bearer ${OLLAMA_API_KEY}`
      }
    })

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
