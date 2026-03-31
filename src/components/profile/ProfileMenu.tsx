import { LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type ProfileMenuProps = {
  onProfileClick: () => void;
  /** When set, show Logout in the menu */
  onLogout?: () => void;
  avatarImageUrl?: string | null;
  /** Shown when no image (e.g. "SA" for admin/vendor shell) */
  avatarFallback?: string;
  align?: 'start' | 'center' | 'end';
};

export default function ProfileMenu({
  onProfileClick,
  onLogout,
  avatarImageUrl,
  avatarFallback = 'SA',
  align = 'end',
}: ProfileMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="rounded-full shrink-0">
          <Avatar className="h-8 w-8">
            {avatarImageUrl ? <AvatarImage src={avatarImageUrl} alt="" /> : null}
            <AvatarFallback>{avatarFallback}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-48">
        <DropdownMenuItem
          onClick={(e) => {
            e.preventDefault();
            onProfileClick();
          }}
        >
          <User className="w-4 h-4 mr-2" />
          Profile
        </DropdownMenuItem>
        {onLogout ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={(e) => {
                e.preventDefault();
                onLogout();
              }}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
