import { documentMetadata, domainAndTitle } from '../annotation-metadata';

const fakeAnnotation = (props = {}) => {
  return {
    document: {},
    uri: 'http://example.com/a/page',
    ...props,
  };
};

describe('documentMetadata', () => {
  it('returns the hostname from annotation.uri as the domain', () => {
    const annotation = fakeAnnotation();
    assert.equal(documentMetadata(annotation).domain, 'example.com');
  });

  context('when annotation.uri does not start with "urn"', () => {
    it('uses annotation.uri as the uri', () => {
      const annotation = fakeAnnotation();
      assert.equal(
        documentMetadata(annotation).uri,
        'http://example.com/a/page',
      );
    });
  });

  context('when document.title is an available', () => {
    it('uses the first document title as the title', () => {
      const annotation = fakeAnnotation({
        document: {
          title: ['My Document', 'My Other Document'],
        },
      });

      assert.equal(
        documentMetadata(annotation).title,
        annotation.document.title[0],
      );
    });
  });

  context('when there is no document.title', () => {
    it('returns the domain as the title', () => {
      const annotation = fakeAnnotation();
      assert.equal(documentMetadata(annotation).title, 'example.com');
    });
  });

  ['http://localhost:5000', '[not a URL]'].forEach(uri => {
    it('returns empty domain if URL is invalid or private', () => {
      const annotation = fakeAnnotation({ uri });
      const { domain } = documentMetadata(annotation);
      assert.equal(domain, '');
    });
  });
});

describe('domainAndTitle', () => {
  context('when an annotation has a non-http(s) uri', () => {
    it('returns no title link', () => {
      const annotation = fakeAnnotation({
        uri: 'file:///example.pdf',
      });

      assert.equal(domainAndTitle(annotation).titleLink, null);
    });
  });

  context('when an annotation has a direct link', () => {
    it('returns the direct link as a title link', () => {
      const annotation = {
        uri: 'https://annotatedsite.com/',
        links: {
          incontext: 'https://example.com',
        },
      };

      assert.equal(domainAndTitle(annotation).titleLink, 'https://example.com');
    });
  });

  context('when an annotation has no direct link but has a http(s) uri', () => {
    it('returns the uri as title link', () => {
      const annotation = fakeAnnotation({
        uri: 'https://example.com',
      });

      assert.equal(domainAndTitle(annotation).titleLink, 'https://example.com');
    });
  });

  context('when the annotation title is shorter than 30 characters', () => {
    it('returns the annotation title as title text', () => {
      const annotation = fakeAnnotation({
        uri: 'https://annotatedsite.com/',
        document: {
          title: ['A Short Document Title'],
        },
      });

      assert.equal(
        domainAndTitle(annotation).titleText,
        'A Short Document Title',
      );
    });
  });

  context('when the annotation title is longer than 30 characters', () => {
    it('truncates the title text with ellipsis character "…"', () => {
      const annotation = fakeAnnotation({
        document: {
          title: ['My Really Really Long Document Title'],
        },
      });

      assert.equal(
        domainAndTitle(annotation).titleText,
        'My Really Really Long Document…',
      );
    });
  });

  context('when the document uri refers to a filename', () => {
    it('returns the filename as domain text', () => {
      const annotation = fakeAnnotation({
        uri: 'file:///path/to/example.pdf',
        document: {
          title: ['Document Title'],
        },
      });

      assert.equal(domainAndTitle(annotation).domain, 'example.pdf');
    });
  });

  context('when domain and title are the same', () => {
    it('returns an empty domain text string', () => {
      const annotation = fakeAnnotation({
        uri: 'https://example.com',
        document: {
          title: ['example.com'],
        },
      });

      assert.equal(domainAndTitle(annotation).domain, '');
    });
  });

  context('when the document has no domain', () => {
    it('returns an empty domain text string', () => {
      const annotation = fakeAnnotation({
        uri: 'doi:10.1234/5678',
        document: {
          title: ['example.com'],
        },
      });

      assert.equal(domainAndTitle(annotation).domain, '');
    });
  });

  context('when the document is a local file with a title', () => {
    it('returns the filename', () => {
      const annotation = fakeAnnotation({
        uri: 'file:///home/seanh/MyFile.pdf',
        document: {
          title: ['example.com'],
        },
      });

      assert.equal(domainAndTitle(annotation).domain, 'MyFile.pdf');
    });
  });
});
