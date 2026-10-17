import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export function GET() {
  return NextResponse.json({ status: 'ok', app: 'openclow' }, { headers: { 'Cache-Control': 'no-store' } })
}
