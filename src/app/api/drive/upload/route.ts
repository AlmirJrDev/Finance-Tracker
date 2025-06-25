// app/api/drive/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'


export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json({ 
        success: false, 
        message: 'Not authenticated' 
      }, { status: 401 })
    }

    const { data, fileName } = await request.json()

    if (!data || !fileName) {
      return NextResponse.json({ 
        success: false, 
        message: 'Data and fileName are required' 
      }, { status: 400 })
    }

    // Converte os dados para string JSON
    const fileContent = JSON.stringify(data, null, 2)
    const blob = new Blob([fileContent], { type: 'application/json' })

    // Cria o FormData para upload
    const formData = new FormData()
    formData.append('metadata', JSON.stringify({
      name: fileName,
      parents: ['appDataFolder'] // Usa a pasta privada do app
    }))
    formData.append('file', blob)

    // Faz upload para o Google Drive
    const uploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
      },
      body: formData
    })

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      console.error('Google Drive API Error:', errorText)
      throw new Error(`Upload failed: ${uploadResponse.status}`)
    }

    const result = await uploadResponse.json()
    
    return NextResponse.json({ 
      success: true, 
      fileId: result.id,
      message: 'File uploaded successfully' 
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Upload failed' 
    }, { status: 500 })
  }
}