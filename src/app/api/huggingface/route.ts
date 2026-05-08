import { NextRequest, NextResponse } from 'next/server'
import { HfInference } from '@huggingface/inference'

export async function POST(request: NextRequest) {
  try {
    const { prompt, apiKey: clientApiKey } = await request.json()
    const apiKey = clientApiKey || process.env.HUGGINGFACE_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'No HuggingFace API key provided' }, { status: 401 })
    }

    const hf = new HfInference(apiKey)
    
    // We parse out the <|system|> ... <|user|> tags and just send the raw text, 
    // or let the model handle the raw prompt block.
    // Llama-3.2-1B-Instruct is extremely reliable on the free inference API.
    const res = await hf.chatCompletion({
      model: "meta-llama/Llama-3.2-1B-Instruct",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 512,
      temperature: 0.7,
    })

    const response = res.choices[0]?.message?.content || ''
    return NextResponse.json({ response })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'An error occurred during inference.' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ available: !!process.env.HUGGINGFACE_API_KEY })
}
