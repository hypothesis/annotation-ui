import { isModerationStatus } from '../moderation-status';

describe('isModerationStatus', () => {
  [
    { moderationStatus: 'foo', expectedResult: false },
    { moderationStatus: 'bar', expectedResult: false },
    { moderationStatus: 'PENDING', expectedResult: true },
    { moderationStatus: 'APPROVED', expectedResult: true },
    { moderationStatus: 'DENIED', expectedResult: true },
    { moderationStatus: 'SPAM', expectedResult: true },
  ].forEach(({ moderationStatus, expectedResult }) => {
    it('returns true if provided value is a moderation status', () => {
      assert.equal(isModerationStatus(moderationStatus), expectedResult);
    });
  });
});
