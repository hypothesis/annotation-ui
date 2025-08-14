import { LinkButton } from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import type { ComponentChildren, JSX } from 'preact';
import { useCallback, useLayoutEffect, useRef, useState } from 'preact/hooks';

import { observeElementSize } from '../utils/observe-element-size';

type InlineControlExcerptProps = {
  /**
   * The excerpt provides internal controls to expand and collapse
   * the content.
   */
  inlineControl: true;

  /**
   * Text on inline control when clicking it will expand the content.
   * Defaults to 'More'.
   */
  inlineControlExpandText?: string;

  /**
   * Text on inline control when clicking it will collapse the content.
   * Defaults to 'Less'.
   */
  inlineControlCollapseText?: string;

  /** Additional styles to pass to the inline controls element. */
  inlineControlStyle?: JSX.CSSProperties;
  /** Additional CSS classes to pass to the inline controls element. */
  inlineControlClasses?: string | string[];
};

type InlineControlProps = InlineControlExcerptProps & {
  isCollapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
};

/**
 * An optional toggle link at the bottom of an excerpt which controls whether
 * it is expanded or collapsed.
 */
function InlineControl({
  isCollapsed,
  setCollapsed,
  inlineControlExpandText = 'More',
  inlineControlCollapseText = 'Less',
  inlineControlStyle,
  inlineControlClasses,
}: InlineControlProps) {
  return (
    <div
      className={classnames(
        // Position these controls at the bottom right of the excerpt
        'absolute block right-0 bottom-0',
        // Give extra width for larger tap target and gradient fade
        // Fade transparent-to-white left-to-right to make the toggle
        // control text (More/Less) more readable above other text.
        // This gradient is implemented to-left to take advantage of Tailwind's
        // automatic to-transparent calculation: this avoids Safari's problem
        // with transparents in gradients:
        // https://bugs.webkit.org/show_bug.cgi?id=150940
        // https://tailwindcss.com/docs/gradient-color-stops#fading-to-transparent
        'w-20 bg-gradient-to-l from-white',
      )}
    >
      <div className="flex justify-end">
        <LinkButton
          variant="text"
          onClick={() => setCollapsed(!isCollapsed)}
          expanded={!isCollapsed}
          title="Toggle visibility of full excerpt text"
          style={inlineControlStyle}
          classes={inlineControlClasses}
          underline="always"
          inline
        >
          {isCollapsed ? inlineControlExpandText : inlineControlCollapseText}
        </LinkButton>
      </div>
    </div>
  );
}

type ExternalControlExcerptProps = {
  /**
   * The caller is responsible for providing their own collapse/expand control,
   * in combination with `collapsed` and `onToggleCollapsed` props.
   */
  inlineControl: false;
};

export type ExcerptProps = {
  children?: ComponentChildren;

  /** Maximum height of the container, in pixels, when it is collapsed. */
  collapsedHeight: number;

  /**
   * An additional margin of pixels by which the content height can exceed
   * `collapsedHeight` before it becomes collapsible.
   */
  overflowThreshold?: number;

  /**
   * Whether a shadow is drawn at the bottom of collapsed content, to hint that
   * content is being hidden.
   *
   * The shadow area can be clicked to expand the container so the content is
   * fully visible.
   *
   * Defaults to `false` for excerpts with inline control, and `true` for
   * excerpts with external control.
   */
  shadow?: boolean;

  /**
   * If the content should be truncated if its height exceeds
   * `collapsedHeight + overflowThreshold`.
   *
   * Use this prop in combination with `onToggleCollapsed` to make this excerpt
   * a controlled component.
   *
   * Defaults to `true`.
   */
  collapsed?: boolean;

  /**
   * If this function is provided, it is called when the user requests to expand
   * the content by clicking the shadowed zone at the bottom of the container
   * (if `shadow` is `true`) or the inline control (if `inlineControl` is `true`)
   */
  onToggleCollapsed?: (collapsed: boolean) => void;

  /**
   * Called when the content height exceeds or falls below
   * `collapsedHeight + overflowThreshold`.
   */
  onCollapsibleChanged?: (isCollapsible: boolean) => void;
} & (InlineControlExcerptProps | ExternalControlExcerptProps);

/**
 * A container which truncates its content when they exceed a specified height.
 *
 * The collapsed state of the container can be handled either via internal
 * controls (if `inlineControls` is `true`) or by the caller using a custom
 * control.
 */
export default function Excerpt({
  children,
  collapsed,
  collapsedHeight,
  onCollapsibleChanged,
  onToggleCollapsed,
  overflowThreshold = 0,
  shadow,
  ...rest
}: ExcerptProps) {
  // If `collapsed` is present, treat this as a controlled component
  const isControlled = typeof collapsed === 'boolean';
  // Only use this local state if Excerpt is uncontrolled
  const [uncontrolledCollapsed, setUncontrolledCollapsed] = useState(
    collapsed ?? true,
  );
  const isCollapsed = isControlled ? collapsed : uncontrolledCollapsed;
  const setCollapsed = useCallback(
    (collapsed: boolean) => {
      onToggleCollapsed?.(collapsed);
      if (!isControlled) {
        setUncontrolledCollapsed(collapsed);
      }
    },
    [isControlled, onToggleCollapsed],
  );

  const inlineControl = rest.inlineControl;
  const withShadow = shadow ?? !inlineControl;
  const contentElement = useRef<HTMLDivElement | null>(null);

  // Measured height of `contentElement` in pixels
  const [contentHeight, setContentHeight] = useState(0);

  // Update the measured height of the content container after initial render,
  // and when the size of the content element changes.
  const updateContentHeight = useCallback(() => {
    const newContentHeight = contentElement.current!.clientHeight;
    setContentHeight(newContentHeight);

    // prettier-ignore
    const isCollapsible =
      newContentHeight > (collapsedHeight + overflowThreshold);
    onCollapsibleChanged?.(isCollapsible);
  }, [collapsedHeight, onCollapsibleChanged, overflowThreshold]);

  useLayoutEffect(() => {
    const cleanup = observeElementSize(
      contentElement.current!,
      updateContentHeight,
    );
    updateContentHeight();
    return cleanup;
  }, [updateContentHeight]);

  // Render the (possibly truncated) content and controls for
  // expanding/collapsing the content.
  // prettier-ignore
  const isOverflowing = contentHeight > (collapsedHeight + overflowThreshold);
  const isExpandable = isOverflowing && isCollapsed;

  const contentStyle: JSX.CSSProperties = {};
  if (contentHeight !== 0) {
    contentStyle.maxHeight = isExpandable ? collapsedHeight : contentHeight;
  }

  return (
    <div
      data-testid="excerpt-container"
      className={classnames(
        'relative overflow-hidden',
        'transition-[max-height] ease-in duration-150',
      )}
      style={contentStyle}
    >
      <div
        className={classnames(
          // Establish new block-formatting context to prevent margin-collapsing
          // in descendent elements from potentially "leaking out" and pushing
          // this element down from the top of the container.
          // See https://developer.mozilla.org/en-US/docs/Web/Guide/CSS/Block_formatting_context
          // See https://github.com/hypothesis/client/issues/1518
          'inline-block w-full',
        )}
        data-testid="excerpt-content"
        ref={contentElement}
      >
        {children}
      </div>
      <div
        data-testid="excerpt-expand"
        role="presentation"
        onClick={() => setCollapsed(false)}
        className={classnames(
          // This element provides a clickable area at the bottom of an
          // expandable excerpt to expand it.
          'transition-[opacity] duration-150 ease-linear',
          'absolute w-full bottom-0 h-touch-minimum',
          {
            // For expandable excerpts with shadow, style this element with a
            // shadow-like gradient
            'bg-gradient-to-b from-white/0 via-95% via-black/10 to-100% to-black/15':
              withShadow && isExpandable,
            'bg-none': !withShadow,
            // Don't make the shadow visible OR clickable if there's nothing
            // to do here (the excerpt isn't expandable)
            'opacity-0 pointer-events-none': !isExpandable,
          },
        )}
        title="Show the full excerpt"
      />
      {isOverflowing && inlineControl && (
        <InlineControl
          isCollapsed={isCollapsed}
          setCollapsed={setCollapsed}
          {...rest}
        />
      )}
    </div>
  );
}
