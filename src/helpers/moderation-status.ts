export type ModerationStatus = 'PENDING' | 'APPROVED' | 'DENIED' | 'SPAM';

export const moderationStatusToLabel: Record<ModerationStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  DENIED: 'Declined',
  SPAM: 'Spam',
} as const;

Object.freeze(moderationStatusToLabel);

const moderationStatuses = Object.keys(moderationStatusToLabel);

/**
 * Whether provided status is a moderation status or not
 */
export const isModerationStatus = (
  status: string,
): status is ModerationStatus => moderationStatuses.includes(status);
