'use client';

import { signOut, useSession } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from './button';

function initials(name: string | null | undefined) {
  if (!name) return 'CF';
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function UserAvatarPopover() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  if (!session) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative rounded-full" aria-label="Conta">
          <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-primary hover:ring-offset-2 transition-all">
            <AvatarImage src={session.user?.image ?? ''} alt={session.user?.name ?? 'Avatar'} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials(session.user?.name)}</AvatarFallback>
          </Avatar>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end" sideOffset={5}>
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={session.user?.image ?? ''} alt="" />
            <AvatarFallback>{initials(session.user?.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{session.user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{session.user?.email}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-4 w-full"
          onClick={() => {
            queryClient.clear();
            signOut();
          }}
        >
          <LogOut className="mr-2 h-4 w-4" /> Sair
        </Button>
      </PopoverContent>
    </Popover>
  );
}
