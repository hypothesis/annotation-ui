export type Annotation = {
  uri: string;
  document: { title: string };
  links: {
    /** A "bouncer" URL that takes the user to see the annotation in context */
    incontext?: string;
    /** URL to view the annotation by itself. */
    html?: string;
  };
};

export type DocumentMetadata = {
  uri: string;
  domain: string;
  title: string;
};

/**
 * Extract document metadata from an annotation.
 */
export function documentMetadata(annotation: Annotation): DocumentMetadata {
  const uri = annotation.uri;

  let domain;
  try {
    domain = new URL(uri).hostname;
  } catch {
    // Annotation URI parsing on the backend is very liberal compared to the URL
    // constructor. There is also some historic invalid data in h (eg [1]).
    // Hence, we must handle URL parsing failures in the client.
    //
    // [1] https://github.com/hypothesis/client/issues/3666
    domain = '';
  }
  if (domain === 'localhost') {
    domain = '';
  }

  let title = domain;
  if (annotation.document && annotation.document.title) {
    title = annotation.document.title[0];
  }

  return { uri, domain, title };
}

export type DomainAndTitle = {
  domain: string;
  titleText: string;
  titleLink: string | null;
};

/**
 * Return the domain and title of an annotation for display on an annotation
 * card.
 */
export function domainAndTitle(annotation: Annotation): DomainAndTitle {
  return {
    domain: domainTextFromAnnotation(annotation),
    titleText: titleTextFromAnnotation(annotation),
    titleLink: titleLinkFromAnnotation(annotation),
  };
}

function titleLinkFromAnnotation(annotation: Annotation): string | null {
  let titleLink: string | null = annotation.uri;

  if (
    titleLink &&
    !(titleLink.indexOf('http://') === 0 || titleLink.indexOf('https://') === 0)
  ) {
    // We only link to http(s) URLs.
    titleLink = null;
  }

  if (annotation.links && annotation.links.incontext) {
    titleLink = annotation.links.incontext;
  }

  return titleLink;
}
/**
 * Returns the domain text from an annotation.
 */
function domainTextFromAnnotation(annotation: Annotation): string {
  const document = documentMetadata(annotation);

  let domainText = '';
  if (document.uri && document.uri.indexOf('file://') === 0 && document.title) {
    const parts = document.uri.split('/');
    const filename = parts[parts.length - 1];
    if (filename) {
      domainText = filename;
    }
  } else if (document.domain && document.domain !== document.title) {
    domainText = document.domain;
  }

  return domainText;
}

/**
 * Returns the title text from an annotation and crops it to 30 chars
 * if needed.
 */
function titleTextFromAnnotation(annotation: Annotation): string {
  const document = documentMetadata(annotation);

  let titleText = document.title;
  if (titleText.length > 30) {
    titleText = titleText.slice(0, 30) + '…';
  }

  return titleText;
}
