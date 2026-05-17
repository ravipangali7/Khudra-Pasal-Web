import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import PortalSidebar, { type PortalSidebarProps } from '@/components/portal/PortalSidebar';
import { cn } from '@/lib/utils';

/** Wraps {@link PortalSidebar} so each nav tap runs the portal route then closes the mobile drawer. */
export function bindPortalSidebarNavClose(sidebar: ReactNode, onClose: () => void): ReactNode {
  if (!isValidElement(sidebar) || sidebar.type !== PortalSidebar) {
    return sidebar;
  }
  const props = sidebar.props as PortalSidebarProps;
  return cloneElement(sidebar as ReactElement<PortalSidebarProps>, {
    className: cn('h-full min-h-0 w-full max-w-none border-0 rounded-none shadow-none', props.className),
    collapsible: false,
    onItemClick: (id: string) => {
      props.onItemClick(id);
      onClose();
    },
  });
}
