import {
  checkAccessibility,
  mockImportedComponents,
} from '@hypothesis/frontend-testing';
import { mount } from '@hypothesis/frontend-testing';

import AnnotationDocumentInfo, { $imports } from '../AnnotationDocumentInfo';

describe('AnnotationDocumentInfo', () => {
  let fakeAnnotation;
  let fakeDomainAndTitle;

  beforeEach(() => {
    fakeAnnotation = {
      links: { html: 'https://example.com' },
    };
    fakeDomainAndTitle = sinon.stub().returns({
      titleText: 'Turtles',
      titleLink: 'http://www.baz',
      domain: 'www.foo.com',
    });

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../helpers/annotation-metadata': {
        domainAndTitle: fakeDomainAndTitle,
      },
    });
  });

  const createAnnotationDocumentInfo = () => {
    return mount(<AnnotationDocumentInfo annotation={fakeAnnotation} />);
  };

  it('should render the document title', () => {
    const wrapper = createAnnotationDocumentInfo();

    assert.include(wrapper.text(), '"Turtles"');
  });

  it('links to document in new tab/window when link available', () => {
    const wrapper = createAnnotationDocumentInfo();
    const link = wrapper.find('a');

    assert.equal(link.prop('href'), 'http://www.baz');
    assert.equal(link.prop('target'), '_blank');
  });

  it('does not link to document when no link available', () => {});

  it('should render domain if available', () => {
    fakeAnnotation.links.html = '';
    const wrapper = createAnnotationDocumentInfo();

    const link = wrapper.find('a');
    assert.include(wrapper.text(), '"Turtles"');
    assert.isFalse(link.exists());
  });

  it(
    'should pass a11y checks',
    checkAccessibility({
      content: () => createAnnotationDocumentInfo(),
    }),
  );
});
