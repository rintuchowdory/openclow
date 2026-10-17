import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
async function proxy(request?: NextRequest) {
  const base = process.env.OLLAMA_API_URL?.replace(/\/$/, '')
  if (!base) return NextResponse.json({ available: false, error: 'Ollama is not configured on this server.' }, { status: request ? 503 : 200 })
  try {
    const response = await fetch(`${base}/api/${request ? 'generate' : 'tags'}`, {
      method: request ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json', ...(process.env.OLLAMA_API_KEY ? { Authorization: `Bearer ${process.env.OLLAMA_API_KEY}` } : {}) },
      ...(request ? { body: JSON.stringify({ ...await request.json(), stream: false }) } : {}),
      signal: AbortSignal.timeout(60000), cache: 'no-store',
    })
    if (!response.ok) return NextResponse.json({ error: 'Configured Ollama service is unavailable.' }, { status: 502 })
    return NextResponse.json(await response.json(), { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ error: 'Could not reach the configured Ollama service.' }, { status: 502 })
  }
}
export function GET() { return proxy() }
export function POST(request: NextRequest) { return proxy(request) }
