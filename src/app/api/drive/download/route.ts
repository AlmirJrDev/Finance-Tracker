// app/api/drive/download/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'


export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json({ 
        success: false, 
        message: 'Not authenticated' 
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const fileName = searchParams.get('fileName')

    if (!fileName) {
      return NextResponse.json({ 
        success: false, 
        message: 'fileName is required' 
      }, { status: 400 })
    }

    // Primeiro, procura o arquivo por name na appDataFolder
    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and parents in 'appDataFolder'&spaces=appDataFolder`,
      {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
        }
      }
    )

    if (!searchResponse.ok) {
      throw new Error(`Search failed: ${searchResponse.status}`)
    }

    const searchResult = await searchResponse.json()
    
    if (!searchResult.files || searchResult.files.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'File not found' 
      }, { status: 404 })
    }

    const fileId = searchResult.files[0].id

    // Baixa o conteúdo do arquivo
    const downloadResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
        }
      }
    )

    if (!downloadResponse.ok) {
      throw new Error(`Download failed: ${downloadResponse.status}`)
    }

    const fileContent = await downloadResponse.text()
    
    try {
      const data = JSON.parse(fileContent)
      return NextResponse.json({ 
        success: true, 
        data: data 
      })
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid JSON file' 
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Download failed' 
    }, { status: 500 })
  }
}