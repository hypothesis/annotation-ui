import { checkAccessibility } from '@hypothesis/frontend-testing';
import { mount } from '@hypothesis/frontend-testing';
import { act } from 'preact/test-utils';
import sinon from 'sinon';

import Excerpt, { $imports } from '../Excerpt';

describe('Excerpt', () => {
  const SHORT_DIV = <div id="foo" style={{ height: 5 }} />;
  const TALL_DIV = (
    <div id="foo" style={{ height: 200 }}>
      foo bar
    </div>
  );
  const DEFAULT_CONTENT = <span className="the-content">default content</span>;

  let fakeObserveElementSize;

  function createExcerpt(props = {}, content = DEFAULT_CONTENT) {
    return mount(
      <Excerpt
        collapse={true}
        collapsedHeight={40}
        inlineControl={false}
        {...props}
      >
        {content}
      </Excerpt>,
      { connected: true },
    );
  }

  beforeEach(() => {
    fakeObserveElementSize = sinon.stub();
    $imports.$mock({
      '../utils/observe-element-size': {
        observeElementSize: fakeObserveElementSize,
      },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  function getExcerptHeight(wrapper) {
    return wrapper.find('[data-testid="excerpt-container"]').prop('style')
      .maxHeight;
  }

  const getToggleButton = wrapper =>
    wrapper.find('LinkButton[title="Toggle visibility of full excerpt text"]');

  it('renders content in container', () => {
    const wrapper = createExcerpt();
    const contentEl = wrapper.find('[data-testid="excerpt-content"]');
    assert.include(contentEl.html(), 'default content');
  });

  it('truncates content if it exceeds `collapsedHeight` + `overflowThreshold`', () => {
    const wrapper = createExcerpt({}, TALL_DIV);
    assert.equal(getExcerptHeight(wrapper), 40);
  });

  it('does not truncate content if it does not exceed `collapsedHeight` + `overflowThreshold`', () => {
    const wrapper = createExcerpt({}, SHORT_DIV);
    assert.equal(getExcerptHeight(wrapper), 5);
  });

  it('updates the collapsed state when the content height changes', () => {
    const wrapper = createExcerpt({}, SHORT_DIV);
    assert.called(fakeObserveElementSize);

    const contentElem = fakeObserveElementSize.getCall(0).args[0];
    const sizeChangedCallback = fakeObserveElementSize.getCall(0).args[1];
    act(() => {
      contentElem.style.height = '400px';
      sizeChangedCallback();
    });
    wrapper.update();

    assert.equal(getExcerptHeight(wrapper), 40);

    act(() => {
      contentElem.style.height = '10px';
      sizeChangedCallback();
    });
    wrapper.update();

    assert.equal(getExcerptHeight(wrapper), 10);
  });

  it('calls `onCollapsibleChanged` when collapsibility changes', () => {
    const onCollapsibleChanged = sinon.stub();
    createExcerpt({ onCollapsibleChanged }, SHORT_DIV);

    const contentElem = fakeObserveElementSize.getCall(0).args[0];
    const sizeChangedCallback = fakeObserveElementSize.getCall(0).args[1];
    act(() => {
      contentElem.style.height = '400px';
      sizeChangedCallback();
    });

    assert.calledWith(onCollapsibleChanged, true);
  });

  it('calls `onToggleCollapsed` when user clicks in bottom shadow to expand excerpt', () => {
    const onToggleCollapsed = sinon.stub();
    const wrapper = createExcerpt({ onToggleCollapsed }, TALL_DIV);
    const control = wrapper.find('[data-testid="excerpt-expand"]');
    assert.equal(getExcerptHeight(wrapper), 40);
    control.simulate('click');
    assert.called(onToggleCollapsed);
  });

  context('when inline controls are enabled', () => {
    it('displays inline controls if collapsed', () => {
      const wrapper = createExcerpt({ inlineControl: true }, TALL_DIV);
      assert.isTrue(wrapper.exists('InlineControl'));
    });

    it('does not display inline controls if not collapsed', () => {
      const wrapper = createExcerpt({ inlineControl: true }, SHORT_DIV);
      assert.isFalse(wrapper.exists('InlineControl'));
    });

    it('toggles the expanded state when clicked', () => {
      const wrapper = createExcerpt({ inlineControl: true }, TALL_DIV);
      const button = getToggleButton(wrapper);
      assert.equal(getExcerptHeight(wrapper), 40);
      act(() => {
        button.props().onClick();
      });
      wrapper.update();
      assert.equal(getExcerptHeight(wrapper), 200);
    });

    [undefined, 'Show more'].forEach(inlineControlExpandText => {
      it("sets button's default state to un-expanded", () => {
        const wrapper = createExcerpt(
          { inlineControl: true, inlineControlExpandText },
          TALL_DIV,
        );
        const button = getToggleButton(wrapper);
        assert.equal(button.prop('expanded'), false);
        assert.equal(button.text(), inlineControlExpandText ?? 'More');
      });
    });

    [undefined, 'Show less'].forEach(inlineControlCollapseText => {
      it("changes button's state to expanded when clicked", () => {
        const wrapper = createExcerpt(
          { inlineControl: true, inlineControlCollapseText },
          TALL_DIV,
        );
        let button = getToggleButton(wrapper);
        act(() => {
          button.props().onClick();
        });
        wrapper.update();
        button = getToggleButton(wrapper);
        assert.equal(button.prop('expanded'), true);
        assert.equal(button.text(), inlineControlCollapseText ?? 'Less');
      });
    });
  });

  context('when excerpt is externally controlled', () => {
    [true, false].forEach(collapsed => {
      it('calls onToggleCollapsed when toggled via inline control', () => {
        const fakeOnToggleCollapsed = sinon.stub();
        const wrapper = createExcerpt(
          {
            inlineControl: true,
            collapsed,
            onToggleCollapsed: fakeOnToggleCollapsed,
          },
          TALL_DIV,
        );

        getToggleButton(wrapper).props().onClick();

        assert.calledWith(fakeOnToggleCollapsed, !collapsed);
      });
    });

    it('calls onToggleCollapsed when toggled via shadow', () => {
      const fakeOnToggleCollapsed = sinon.stub();
      const wrapper = createExcerpt(
        {
          shadow: true,
          collapsed: true,
          onToggleCollapsed: fakeOnToggleCollapsed,
        },
        TALL_DIV,
      );

      wrapper.find('[data-testid="excerpt-expand"]').props().onClick();

      assert.calledWith(fakeOnToggleCollapsed, false);
    });

    it('updates collapsed state when toggled externally', () => {
      const wrapper = createExcerpt(
        { inlineControl: true, collapsed: true },
        TALL_DIV,
      );
      const isCollapsed = () =>
        wrapper.find('InlineControl').prop('isCollapsed');

      assert.isTrue(isCollapsed());
      wrapper.setProps({ collapsed: false });
      assert.isFalse(isCollapsed());
    });
  });

  it(
    'should pass a11y checks',
    checkAccessibility([
      {
        name: 'external controls',
        content: () => createExcerpt({}, TALL_DIV),
      },
      {
        name: 'internal controls',
        content: () => createExcerpt({ inlineControl: true }, TALL_DIV),
      },
    ]),
  );
});
