import { Link } from '@hypothesis/frontend-shared';

import type { Annotation } from '../helpers/annotation-metadata';
import { domainAndTitle } from '../helpers/annotation-metadata';

export type AnnotationDocumentInfoProps = {
  annotation: Annotation;
};

/**
 * Render some metadata about an annotation's document and link to it
 * if a link is available.
 */
export default function AnnotationDocumentInfo({
  annotation,
}: AnnotationDocumentInfoProps) {
  const { domain, titleText: title, titleLink } = domainAndTitle(annotation);
  const annotationURL = annotation.links?.html || '';
  // There are some cases at present in which linking directly to an
  // annotation's document is not immediately feasible—e.g in an LMS context
  // where the original document might not be available outside of an
  // assignment (e.g. Canvas files), and/or wouldn't be able to present
  // any associated annotations.
  // For the present, disable links to annotation documents for all third-party
  // annotations until we have a more nuanced way of making linking determinations.
  // The absence of a link to a single-annotation view is a signal that this
  // is a third-party annotation.
  // Also, of course, verify that there is a URL to the document (titleLink)
  const link = annotationURL && titleLink ? titleLink : '';

  return (
    <div className="flex gap-x-1">
      <div className="text-color-text-light">
        on &quot;
        {link ? (
          <Link href={link} target="_blank" underline="none">
            {title}
          </Link>
        ) : (
          <span>{title}</span>
        )}
        &quot;
      </div>
      {domain && <span className="text-color-text-light">({domain})</span>}
    </div>
  );
}
