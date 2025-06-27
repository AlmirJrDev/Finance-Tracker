// app/api/drive/update/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

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

    // Primeiro, procura se o arquivo já existe
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
    
    // Converte os dados para string JSON
    const fileContent = JSON.stringify(data, null, 2)

    if (searchResult.files && searchResult.files.length > 0) {
      // Arquivo existe, atualiza
      const fileId = searchResult.files[0].id
      
      const updateResponse = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: fileContent
        }
      )

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text()
        console.error('Google Drive Update Error:', errorText)
        throw new Error(`Update failed: ${updateResponse.status}`)
      }

      const result = await updateResponse.json()
      
      return NextResponse.json({ 
        success: true, 
        fileId: result.id,
        message: 'File updated successfully',
        action: 'updated'
      })

    } else {
      // Arquivo não existe, cria novo
      const blob = new Blob([fileContent], { type: 'application/json' })
      const formData = new FormData()
      
      formData.append('metadata', JSON.stringify({
        name: fileName,
        parents: ['appDataFolder']
      }))
      formData.append('file', blob)

      const uploadResponse = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
          },
          body: formData
        }
      )

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text()
        console.error('Google Drive Upload Error:', errorText)
        throw new Error(`Upload failed: ${uploadResponse.status}`)
      }

      const result = await uploadResponse.json()
      
      return NextResponse.json({ 
        success: true, 
        fileId: result.id,
        message: 'File created successfully',
        action: 'created'
      })
    }

  } catch (error) {
    console.error('Update/Upload error:', error)
    return NextResponse.json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Operation failed' 
    }, { status: 500 })
  }
}