import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json()

    const apiKey = process.env.HUGGINGFACE_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'HUGGINGFACE_API_KEY is not set' }, { status: 500 })
    }

    // Use HuggingFace Inference API with Zephyr-7B (free, no payment required)
    const res = await fetch('https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 512,
          temperature: 0.7,
          top_p: 0.95,
          do_sample: true,
          return_full_text: false
        }
      })
    })

    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json(
        { error: err.error ?? 'HuggingFace request failed' },
        { status: res.status }
      )
    }

    const data = await res.json()

    // HuggingFace returns an array of generated sequences
    const response = Array.isArray(data)
      ? data[0]?.generated_text ?? ''
      : data?.generated_text ?? ''

    return NextResponse.json({ response })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET() {
  const apiKey = process.env.HUGGINGFACE_API_KEY
  if (apiKey) {
    return NextResponse.json({ available: true })
  }
  return NextResponse.json({ available: false }, { status: 503 })
}
