import { PropsWithChildren } from 'react';

/**
 * Enterprise slot around the notification bell. The enterprise build replaces
 * this file with the team invitation dialog; open source renders the bell
 * as-is.
 */
export function TeamInvitationReminderDialog({ children }: PropsWithChildren) {
  return <>{children}</>;
}
