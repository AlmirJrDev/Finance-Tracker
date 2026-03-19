import { useSession } from 'next-auth/react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { GoogleDriveSync } from '../googleDriveSync'
import { Button } from './button'


export function UserAvatarPopover() {
  const { data: session,  } = useSession()

  // Função para obter as iniciais do nome
  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'CF'
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        {session ?( <button className="relative">
          <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-blue-500 hover:ring-offset-2 transition-all">
            <AvatarImage 
              src={session?.user?.image || ''} 
              alt={session?.user?.name || 'User avatar'}
            />
            <AvatarFallback className="bg-blue-500 text-white text-xs">
              {getInitials(session?.user?.name)}
            </AvatarFallback>
          </Avatar>
         
        </button>) : (<Button className='cursor-pointer'>
Entrar
        </Button> 
          
        )} 
       
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-96 p-0" 
        align="end"
        sideOffset={5}
      >
        <GoogleDriveSync />
      </PopoverContent>
    </Popover>
  )
}