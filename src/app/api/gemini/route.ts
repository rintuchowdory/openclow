import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { prompt, apiKey: clientApiKey } = await request.json()
    const apiKey = clientApiKey || process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'No Gemini API key' }, { status: 401 })
    }
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    })
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { message: res.statusText } }))
      return NextResponse.json({ error: err.error?.message ?? `Failed (${res.status})` }, { status: res.status })
    }
    
    const data = await res.json()
    return NextResponse.json({ response: data.candidates[0].content.parts[0].text })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ available: !!process.env.GEMINI_API_KEY })
}
