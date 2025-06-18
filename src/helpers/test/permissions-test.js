import { isPrivate } from '../permissions';

describe('isPrivate', () => {
  const userid = 'acct:flash@gord.on';

  function privatePermissions(userid) {
    return {
      read: [userid],
      update: [userid],
      delete: [userid],
    };
  }

  function sharedPermissions(userid, groupid) {
    return Object.assign(privatePermissions(userid), {
      read: ['group:' + groupid],
    });
  }

  it('returns true if only specific users can read the annotation', () => {
    const perms = privatePermissions(userid);
    assert.isTrue(isPrivate(perms));
  });

  it('returns false if a group can read the annotation', () => {
    const perms = sharedPermissions(userid, 'gid');
    assert.isFalse(isPrivate(perms));
  });
});
