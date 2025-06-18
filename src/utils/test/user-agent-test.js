import { isIOS } from '../user-agent';

describe('isIOS', () => {
  it('returns true when the user agent is an iOS', () => {
    assert.isBoolean(isIOS()); // Test to check default parameters
    assert.isTrue(
      isIOS({ platform: 'iPad Simulator', userAgent: 'dummy' }, false),
    );
    assert.isTrue(
      isIOS({ platform: 'iPhone Simulator', userAgent: 'dummy' }, false),
    );
    assert.isTrue(
      isIOS({ platform: 'iPod Simulator', userAgent: 'dummy' }, false),
    );
    assert.isTrue(isIOS({ platform: 'iPad', userAgent: 'dummy' }, false));
    assert.isTrue(isIOS({ platform: 'iPhone', userAgent: 'dummy' }, false));
    assert.isTrue(isIOS({ platform: 'iPod', userAgent: 'dummy' }, false));
    assert.isTrue(isIOS({ platform: 'dummy', userAgent: 'Mac' }, true));
  });

  it('returns false when the user agent is not an iOS', () => {
    assert.isFalse(isIOS({ platform: 'dummy', userAgent: 'dummy' }, true));
    assert.isFalse(isIOS({ platform: 'dummy', userAgent: 'Mac' }, false));
  });
});
