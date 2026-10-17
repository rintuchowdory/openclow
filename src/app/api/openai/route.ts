import { NextRequest } from 'next/server'
import { providerChat, providerStatus } from '@/lib/providers'

export const dynamic = 'force-dynamic'
export function POST(request: NextRequest) { return providerChat(request, 'openai') }
export function GET() { return providerStatus('openai') }
