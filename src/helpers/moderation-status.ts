import type { IconComponent } from '@hypothesis/frontend-shared';
import {
  CautionIcon,
  CheckAllIcon,
  DottedCircleIcon,
  RestrictedIcon,
} from '@hypothesis/frontend-shared';

export type ModerationStatus = 'PENDING' | 'APPROVED' | 'DENIED' | 'SPAM';

/**
 * Map of moderation statuses to their corresponding human-friendly label and
 * icon
 */
export const moderationStatusInfo: Record<
  ModerationStatus,
  { label: string; icon: IconComponent }
> = {
  PENDING: { label: 'Pending', icon: DottedCircleIcon },
  APPROVED: { label: 'Approved', icon: CheckAllIcon },
  DENIED: { label: 'Declined', icon: RestrictedIcon },
  SPAM: { label: 'Spam', icon: CautionIcon },
};

Object.freeze(moderationStatusInfo);

const moderationStatuses = Object.keys(moderationStatusInfo);

/**
 * Whether provided status is a moderation status or not
 */
export const isModerationStatus = (
  status: string,
): status is ModerationStatus => moderationStatuses.includes(status);
