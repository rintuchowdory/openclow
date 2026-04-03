import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json()
    const apiKey = process.env.HUGGINGFACE_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'HUGGINGFACE_API_KEY is not set' }, { status: 500 })
    }

    const res = await fetch('https://router.huggingface.co/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'Qwen/Qwen2.5-7B-Instruct',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 512,
        temperature: 0.7
      })
    })

    const data = await res.json()
    if (!res.ok) return NextResponse.json({ error: data.error?.message ?? 'HuggingFace failed' }, { status: res.status })

    const response = data.choices?.[0]?.message?.content ?? ''
    return NextResponse.json({ response })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET() {
  const apiKey = process.env.HUGGINGFACE_API_KEY
  return apiKey
    ? NextResponse.json({ available: true })
    : NextResponse.json({ available: false }, { status: 503 })
}
