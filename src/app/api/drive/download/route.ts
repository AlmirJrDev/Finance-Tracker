
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    success: false,
    message: 'Este endpoint foi descontinuado. Os dados agora são gerenciados pelo backend.',
  }, { status: 410 })
}