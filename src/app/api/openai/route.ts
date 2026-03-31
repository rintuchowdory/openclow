import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json()

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY is not set' }, { status: 500 })
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024
      })
    })

    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ error: err.error?.message ?? 'OpenAI request failed' }, { status: res.status })
    }

    const data = await res.json()
    const response = data.choices[0].message.content

    // Return in the same shape as the Ollama route so the client can treat them uniformly
    return NextResponse.json({ response })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET() {
  const apiKey = process.env.OPENAI_API_KEY
  if (apiKey) {
    return NextResponse.json({ available: true })
  }
  return NextResponse.json({ available: false }, { status: 503 })
}
