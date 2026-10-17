import { NextRequest } from 'next/server'
import { providerChat, providerStatus } from '@/lib/providers'

export const dynamic = 'force-dynamic'
export function POST(request: NextRequest) { return providerChat(request, 'huggingface') }
export function GET() { return providerStatus('huggingface') }
