import {
  checkAccessibility,
  delay,
  mockImportedComponents,
} from '@hypothesis/frontend-testing';
import { mount } from '@hypothesis/frontend-testing';
import { act } from 'preact/test-utils';
import sinon from 'sinon';

import AnnotationShareControl, { $imports } from '../AnnotationShareControl';

describe('AnnotationShareControl', () => {
  let fakeAnnotation;
  let fakeGroup;
  let fakeIsPrivate;
  let fakeIsIOS;
  let fakeUseTimeout;

  const getIconButton = (wrapper, iconName) => {
    return wrapper
      .find('IconButton')
      .filterWhere(n => n.find(iconName).exists());
  };

  function createComponent(props = {}) {
    return mount(
      <AnnotationShareControl
        annotation={fakeAnnotation}
        group={fakeGroup}
        {...props}
      />,
      { connected: true },
    );
  }

  function openElement(wrapper) {
    act(() => {
      wrapper.find('IconButton').props().onClick();
    });
    wrapper.update();
  }

  function isLinkInputFocused() {
    return (
      document.activeElement.getAttribute('aria-label') ===
      'Use this URL to share this annotation'
    );
  }

  beforeEach(() => {
    fakeAnnotation = {
      group: 'fakegroup',
      permissions: {},
      user: 'acct:bar@foo.com',
      uri: 'http://www.example.com',
      links: {
        html: 'https://www.example.com',
      },
    };

    fakeGroup = {
      name: 'My Group',
      type: 'private',
    };
    fakeIsPrivate = sinon.stub().returns(false);
    fakeIsIOS = sinon.stub().returns(false);

    fakeUseTimeout = sinon
      .stub()
      .returns(sinon.stub().callsFake(callback => setTimeout(callback, 0)));

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../helpers/permissions': { isPrivate: fakeIsPrivate },
      '../utils/user-agent': { isIOS: fakeIsIOS },
      '../hooks/use-timeout': {
        useTimeout: fakeUseTimeout,
      },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('does not render component if annotation group is not available', () => {
    const wrapper = createComponent({ group: null });
    assert.equal(wrapper.html(), '');
  });

  it('toggles the share control element when the button is clicked', () => {
    const wrapper = createComponent();
    const button = getIconButton(wrapper, 'ShareIcon');

    act(() => {
      button.props().onClick();
    });
    wrapper.update();

    assert.isTrue(wrapper.find('Popover').prop('open'));
  });

  it('closes the Popover when onClose is called', () => {
    const wrapper = createComponent();
    openElement(wrapper);

    assert.isTrue(wrapper.find('Popover').prop('open'));
    wrapper.find('Popover').props().onClose();
    wrapper.update();
    assert.isFalse(wrapper.find('Popover').prop('open'));
  });

  it('renders the share URI in a readonly input field', () => {
    const expectedShareURI = 'https://hyp.is';
    fakeAnnotation.links = { incontext: expectedShareURI };

    const wrapper = createComponent();
    openElement(wrapper);

    const inputEl = wrapper.find('input');
    assert.equal(inputEl.prop('value'), expectedShareURI);
    assert.isTrue(inputEl.prop('readOnly'));
  });

  describe('copying the share URI to the clipboard', () => {
    let onCopy;
    let fakeClipboardWriteText;

    beforeEach(() => {
      onCopy = sinon.stub();
      fakeClipboardWriteText = sinon.stub(navigator.clipboard, 'writeText');
    });

    afterEach(() => {
      navigator.clipboard.writeText.restore();
    });

    it('copies the share link to the clipboard when the copy button is clicked', async () => {
      const wrapper = createComponent({ onCopy });
      openElement(wrapper);

      await getIconButton(wrapper, 'CopyIcon').props().onClick();

      assert.calledWith(fakeClipboardWriteText, 'https://www.example.com');
      assert.calledWith(onCopy, { ok: true, value: 'https://www.example.com' });
    });

    it('indicates there was an error if copying was unsuccessful', () => {
      const error = new Error('Error copying');
      fakeClipboardWriteText.throws(error);

      const wrapper = createComponent({ onCopy });
      openElement(wrapper);

      getIconButton(wrapper, 'CopyIcon').props().onClick();

      assert.calledWith(onCopy, { ok: false, error });
    });

    it('replaces copy icon with check and eventually goes back to the copy icon', async () => {
      const wrapper = createComponent({ onCopy });
      openElement(wrapper);

      await getIconButton(wrapper, 'CopyIcon').props().onClick();
      wrapper.update();

      assert.isTrue(getIconButton(wrapper, 'CheckIcon').exists());
      assert.isFalse(getIconButton(wrapper, 'CopyIcon').exists());

      // Once the timeout clears, the copy icon will be restored
      await delay(0);
      wrapper.update();

      assert.isFalse(getIconButton(wrapper, 'CheckIcon').exists());
      assert.isTrue(getIconButton(wrapper, 'CopyIcon').exists());
    });
  });

  [
    {
      groupType: 'private',
      isPrivate: false,
      expected: 'Only members of the group My Group may view this annotation.',
    },
    {
      groupType: 'open',
      isPrivate: false,
      expected: 'Anyone using this link may view this annotation.',
    },
    {
      groupType: 'private',
      isPrivate: true,
      expected: 'Only you may view this annotation.',
    },
    {
      groupType: 'open',
      isPrivate: true,
      expected: 'Only you may view this annotation.',
    },
    {
      groupType: 'private',
      isPrivate: false,
      commentsMode: true,
      expected: 'Only members of the group My Group may view this comment.',
    },
    {
      groupType: 'open',
      isPrivate: false,
      commentsMode: true,
      expected: 'Anyone using this link may view this comment.',
    },
    {
      groupType: 'private',
      isPrivate: true,
      commentsMode: true,
      expected: 'Only you may view this comment.',
    },
    {
      groupType: 'open',
      isPrivate: true,
      commentsMode: true,
      expected: 'Only you may view this comment.',
    },
  ].forEach(({ groupType, isPrivate, commentsMode, expected }) => {
    it(`renders the correct sharing information for a ${groupType} group when annotation privacy is ${isPrivate}`, () => {
      fakeIsPrivate.returns(isPrivate);
      fakeGroup.type = groupType;
      const wrapper = createComponent({ group: fakeGroup, commentsMode });
      openElement(wrapper);

      const permissionsEl = wrapper.find('[data-testid="share-details"]');
      assert.equal(permissionsEl.text(), expected);
    });
  });

  it('renders an explanation if annotation cannot be shared in context', () => {
    fakeAnnotation.uri = 'file:///some/local/file';
    const wrapper = createComponent();
    openElement(wrapper);

    const detailsEl = wrapper.find('[data-testid="share-details"]');
    assert.include(
      detailsEl.text(),
      'This annotation cannot be shared in its original context',
    );
  });

  it('focuses the share-URI input when opened on non-iOS', () => {
    const wrapper = createComponent();
    openElement(wrapper);
    wrapper.update();

    assert.isTrue(isLinkInputFocused());
  });

  it("doesn't focus the share-URI input when opened on iOS", () => {
    fakeIsIOS.returns(true);
    const wrapper = createComponent();
    openElement(wrapper);
    wrapper.update();

    assert.isFalse(isLinkInputFocused());
  });

  it(
    'should pass a11y checks',
    checkAccessibility(
      {
        name: 'when closed',
        content: () => createComponent(),
      },
      {
        name: 'when open',
        content: () => {
          const wrapper = createComponent();
          openElement(wrapper);
          wrapper.update();
          return wrapper;
        },
      },
    ),
  );
});
