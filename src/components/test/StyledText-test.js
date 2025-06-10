import { mount } from '@hypothesis/frontend-testing';

import { StyledText } from '..';

describe('StyledText', () => {
  function createComponent(children, classes) {
    return mount(<StyledText classes={classes}>{children}</StyledText>);
  }

  [
    { children: 'Foo' },
    { children: <p>Lorem ipsum</p>, expectedText: 'Lorem ipsum' },
  ].forEach(({ children, expectedText = children }) => {
    it('wraps provided children', () => {
      const wrapper = createComponent(children);
      assert.equal(wrapper.text(), expectedText);
    });
  });

  ['text-center', 'flex'].forEach(classes => {
    it('sets provided classes', () => {
      const wrapper = createComponent('', classes);
      assert.equal(wrapper.find('StyledText').prop('classes'), classes);
    });
  });
});
