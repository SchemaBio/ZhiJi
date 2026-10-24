'use client';

import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar, Tooltip } from '@schema/ui-kit';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';

interface UserMenuProps {
  collapsed?: boolean;
}

export function UserMenu({ collapsed = false }: UserMenuProps) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    router.push('/login');
  };

  const displayName = user?.name || '未登录';
  const displayEmail = user?.email || '';

  const triggerButton = (
    <PopoverPrimitive.Trigger asChild>
      <button
        className={`
          flex items-center gap-2 rounded-md transition-all duration-fast
          hover:bg-canvas-inset p-1.5
          ${collapsed ? 'justify-center' : 'w-full'}
        `}
        aria-label="用户菜单"
      >
        <Avatar
          name={displayName}
          size="small"
          className="bg-accent-emphasis text-white ring-2 ring-accent-muted"
        />
        {!collapsed && (
          <span className="text-sm text-fg-default truncate">{displayName}</span>
        )}
      </button>
    </PopoverPrimitive.Trigger>
  );

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      {collapsed ? (
        <Tooltip content={displayName} placement="right" variant="nav">
          {triggerButton}
        </Tooltip>
      ) : (
        triggerButton
      )}
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side={collapsed ? 'right' : 'top'}
          align={collapsed ? 'start' : 'center'}
          sideOffset={4}
          className="z-50 w-56 rounded-md border border-border bg-canvas shadow-md"
        >
          {/* User info */}
          <div className="px-3 py-2 border-b border-border">
            <p className="text-sm font-medium text-fg-default">{displayName}</p>
            <p className="text-xs text-fg-muted">{displayEmail}</p>
          </div>

          {/* Menu items */}
          <div className="py-1 border-b border-border">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className={`
                flex items-center gap-2 w-full px-3 py-2 text-sm text-left
                text-fg-default hover:bg-canvas-subtle
                transition-colors duration-fast
              `}
            >
              <User className="w-4 h-4" />
              个人设置
            </Link>
          </div>

          {/* Logout */}
          <div className="py-1">
            <button
              onClick={handleLogout}
              className={`
                flex items-center gap-2 w-full px-3 py-2 text-sm text-left
                text-danger-fg hover:bg-danger-subtle
                transition-colors duration-fast
              `}
            >
              <LogOut className="w-4 h-4" />
              退出登录
            </button>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
