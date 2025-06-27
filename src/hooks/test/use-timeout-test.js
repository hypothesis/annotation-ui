import { delay, mount } from '@hypothesis/frontend-testing';
import sinon from 'sinon';

import { useTimeout } from '../use-timeout';

describe('useTimeout', () => {
  let fakeSetTimeout;
  let fakeClearTimeout;
  let currentSetTimeout;

  beforeEach(() => {
    fakeSetTimeout = sinon
      .stub()
      .callsFake(callback => setTimeout(callback, 0));
    fakeClearTimeout = sinon.stub();
    currentSetTimeout = undefined;
  });

  function TestComponent() {
    currentSetTimeout = useTimeout(fakeSetTimeout, fakeClearTimeout);
    return null;
  }

  function createComponent() {
    return mount(<TestComponent />);
  }

  it('calls setTimeout when returned setTimeout-like callback is invoked', async () => {
    const callback = sinon.stub();
    createComponent();

    assert.notCalled(fakeSetTimeout);
    currentSetTimeout(callback, 500);
    assert.calledWith(fakeSetTimeout, sinon.match.func, 500);

    // The callback passed to the timeout will also be called after the timeout
    await delay(0);
    assert.called(callback);
  });

  it('clears current timeout when unmounted', () => {
    fakeSetTimeout.returns(1);
    const wrapper = createComponent();

    currentSetTimeout(sinon.stub(), 500);

    wrapper.unmount();
    assert.called(fakeClearTimeout);
  });
});
