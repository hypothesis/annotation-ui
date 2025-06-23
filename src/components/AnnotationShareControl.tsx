import {
  CopyIcon,
  IconButton,
  Input,
  InputGroup,
  Popover,
  ShareIcon,
} from '@hypothesis/frontend-shared';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

import type { Group } from '../helpers';
import type { Annotation } from '../helpers/annotation-metadata';
import { isPrivate } from '../helpers/permissions';
import { isIOS } from '../utils/user-agent';

export type AnnotationShareControlProps = {
  /** The annotation in question */
  annotation: Annotation;
  /** Group to which the annotation belongs */
  group: Group | null;

  /**
   * Invoked when the URI is copied to the clipboard.
   * It indicates if copying to the clipboard was successful or not.
   */
  onCopy?: (result: { successful: boolean }) => void;
};

function selectionOverflowsInputElement() {
  // On iOS the selection overflows the input element
  // See: https://github.com/hypothesis/client/pull/2799
  return isIOS();
}

/**
 * Retrieve an appropriate sharing link for this annotation.
 *
 * If the annotation is on a shareable document (i.e. its document is
 * web-accessible), prefer the `incontext` (bouncer) link, but fallback to the
 * `html` (single-annotation `h` web view) link if needed.
 *
 * If the annotation is not on a shareable document, don't use the `incontext`
 * link as that won't work; only use the single-annotation-view `html` link.
 *
 * Note that `html` links are not provided by the service for third-party
 * annotations.
 */
function annotationSharingLink(
  annotation: Annotation,
  isShareableURI: boolean,
): string | null {
  if (isShareableURI) {
    return annotation.links?.incontext ?? annotation.links?.html ?? null;
  } else {
    return annotation.links?.html ?? null;
  }
}

/**
 * Share button which opens a Popover for sharing a single annotation.
 */
export default function AnnotationShareControl({
  annotation,
  group,
  onCopy,
}: AnnotationShareControlProps) {
  const annotationIsPrivate = isPrivate(annotation.permissions);
  const inContextAvailable = /^http(s?):/i.test(annotation.uri);
  const shareURI = annotationSharingLink(annotation, inContextAvailable);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const shareRef = useRef<HTMLDivElement | null>(null);

  const [isOpen, setOpen] = useState(false);
  const wasOpen = useRef(isOpen);

  const copyShareLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareURI!);
      onCopy?.({ successful: true });
    } catch {
      onCopy?.({ successful: false });
    }
  }, [onCopy, shareURI]);

  const toggleSharePanel = () => setOpen(prev => !prev);

  useEffect(() => {
    if (wasOpen.current !== isOpen) {
      wasOpen.current = isOpen;

      if (isOpen && !selectionOverflowsInputElement()) {
        // Panel was just opened: select and focus the share URI for convenience
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
  }, [isOpen]);

  if (!group || !shareURI) {
    return null;
  }

  // Generate some descriptive text about who may see the annotation if they
  // follow the share link.
  // First: Based on the type of the group the annotation is in, who would
  // be able to view it?
  const groupSharingInfo =
    group.type === 'private' ? (
      <span>
        Only members of the group <em>{group.name}</em> may view this
        annotation.
      </span>
    ) : (
      <span>Anyone using this link may view this annotation.</span>
    );

  // However, if the annotation is marked as "only me" (`annotationIsPrivate` is `true`),
  // then group sharing settings are irrelevant—only the author may view the
  // annotation.
  const annotationSharingInfo = annotationIsPrivate ? (
    <span>Only you may view this annotation.</span>
  ) : (
    groupSharingInfo
  );

  return (
    <div className="relative" ref={shareRef}>
      <IconButton
        icon={ShareIcon}
        title="Share"
        onClick={toggleSharePanel}
        expanded={isOpen}
      />
      <Popover
        open={isOpen}
        onClose={() => setOpen(false)}
        anchorElementRef={shareRef}
        align="right"
        placement="above"
        arrow
        classes={
          // Set explicit width for browsers not supporting native popover API
          // eslint-disable-next-line no-prototype-builtins
          !HTMLElement.prototype.hasOwnProperty('popover') ? 'w-max' : undefined
        }
      >
        <div className="p-2 flex flex-col gap-y-2">
          <h2 className="text-brand text-[14px] font-medium">
            Share this annotation
          </h2>
          <div className="flex w-full text-[13px]">
            <InputGroup>
              <Input
                aria-label="Use this URL to share this annotation"
                type="text"
                value={shareURI}
                readOnly
                elementRef={inputRef}
              />
              <IconButton
                icon={CopyIcon}
                title="Copy share link to clipboard"
                onClick={copyShareLink}
                variant="dark"
              />
            </InputGroup>
          </div>
          <div className="text-[13px] font-normal" data-testid="share-details">
            {inContextAvailable ? (
              <>{annotationSharingInfo}</>
            ) : (
              <>
                This annotation cannot be shared in its original context because
                it was made on a document that is not available on the web. This
                link shares the annotation by itself.
              </>
            )}
          </div>
        </div>
      </Popover>
    </div>
  );
}
