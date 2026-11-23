import createDOMPurify from 'dompurify';
import escapeHTML from 'escape-html';
import katex from 'katex';
import showdown from 'showdown';

const DOMPurify = createDOMPurify(window);

/**
 * Elements removed from rendered annotations.
 *
 * - `form` can submit whatever the reader types to an external site. Its
 *   children are kept, so form controls used cosmetically still render.
 * - `style` applies CSS to the whole page, not just the annotation.
 * - `dialog` is positioned over other content by the browser's default styles.
 */
const FORBIDDEN_TAGS = ['form', 'style', 'dialog'];

/**
 * Attributes removed from rendered annotations.
 *
 * - `autoplay` starts media without the reader asking for it.
 * - `class` lets content pick up the host application's own CSS classes,
 *   including ones which position content over the rest of the UI.
 * - `popover*` and `command*` can show content in the top layer, or trigger
 *   popovers and dialogs that belong to the host application.
 * - `overflow` (SVG) lets a drawing paint outside of its own box.
 */
const FORBIDDEN_ATTRS = [
  'autoplay',
  'class',
  'command',
  'commandfor',
  'overflow',
  'popover',
  'popovertarget',
  'popovertargetaction',
];

/**
 * Inline CSS properties which are allowed in annotations.
 *
 * Entries are matched against longhand property names, either exactly or as a
 * prefix followed by "-". For example "border" matches "border-top-color".
 *
 * Only properties which affect an element's appearance within the normal
 * layout flow are listed. Anything which can move or paint content outside of
 * its own box (`position`, `inset`, `transform`, `z-index`, `box-shadow`,
 * `outline` etc.) is deliberately absent.
 */
const ALLOWED_STYLE_PROPERTIES = [
  'background',
  'border',
  'box-sizing',
  'clear',
  'color',
  'cursor',
  'display',
  'float',
  'font',
  'height',
  'line-height',
  'list-style',
  'margin',
  'max-height',
  'max-width',
  'min-height',
  'min-width',
  'opacity',
  'overflow',
  'padding',
  'text',
  'vertical-align',
  'white-space',
  'width',
];

/**
 * Properties which match {@link ALLOWED_STYLE_PROPERTIES} by prefix, but can
 * paint outside of the element's box.
 */
const FORBIDDEN_STYLE_PROPERTIES = ['border-image', 'text-shadow'];

/** Properties whose value must be a plain, non-negative length. */
const NON_NEGATIVE_STYLE_PROPERTIES = ['margin', 'text-indent'];

const nonNegativeLengthPattern = /^(auto|\d*\.?\d+(%|[a-z]+)?)$/;

function matchesProperty(property: string, names: string[]) {
  return names.some(
    name => property === name || property.startsWith(name + '-'),
  );
}

function isStyleAllowed(property: string, value: string): boolean {
  if (
    !matchesProperty(property, ALLOWED_STYLE_PROPERTIES) ||
    matchesProperty(property, FORBIDDEN_STYLE_PROPERTIES)
  ) {
    return false;
  }

  // `var()` references would be resolved against the host application's custom
  // properties, so we can't tell what the final value will be. This also
  // excludes longhands of a shorthand that used `var()`, which have an empty
  // value.
  if (!value || value.includes('var(')) {
    return false;
  }

  if (matchesProperty(property, NON_NEGATIVE_STYLE_PROPERTIES)) {
    return nonNegativeLengthPattern.test(value);
  }
  if (matchesProperty(property, ['overflow'])) {
    // "visible" is the default for HTML elements, but for SVG it would allow
    // drawing outside of the image.
    return value !== 'visible';
  }
  if (property === 'vertical-align') {
    // Lengths and percentages shift the element by an arbitrary distance.
    return /^[a-z-]+$/.test(value);
  }

  return true;
}

/**
 * Remove inline styles which are not in {@link ALLOWED_STYLE_PROPERTIES}.
 *
 * This relies on the browser's parsing of the `style` attribute, which expands
 * shorthand properties (eg. `inset`, `margin`) into longhands.
 */
function filterInlineStyles(element: Element) {
  const style = (element as HTMLElement | SVGElement).style;
  if (!style) {
    element.removeAttribute('style');
    return;
  }

  const allowed: Array<[property: string, value: string, priority: string]> =
    [];
  for (let i = 0; i < style.length; i++) {
    const property = style[i];
    const value = style.getPropertyValue(property).trim().toLowerCase();
    if (isStyleAllowed(property, value)) {
      allowed.push([
        property,
        style.getPropertyValue(property),
        style.getPropertyPriority(property),
      ]);
    }
  }

  style.cssText = '';
  for (const [property, value, priority] of allowed) {
    style.setProperty(property, value, priority);
  }
  if (style.length === 0) {
    element.removeAttribute('style');
  }
}

const mathPlaceholderPattern = /\{math:\d+\}/g;

DOMPurify.addHook('afterSanitizeAttributes', node => {
  // Ensure that any links generated either by Showdown or in the markdown/HTML
  // passed to Showdown open in an external window.
  if ('target' in node) {
    node.setAttribute('target', '_blank');
  }

  // A masked field is what makes a fake login prompt look real, and may
  // trigger password manager autofill.
  if (
    node.nodeName === 'INPUT' &&
    (node as HTMLInputElement).type === 'password'
  ) {
    node.setAttribute('type', 'text');
  }

  if (node.hasAttribute('style')) {
    filterInlineStyles(node);
  }

  // Math is rendered into the sanitized HTML afterwards, in place of
  // placeholders. That is only safe where the placeholder is in text content,
  // so remove any which ended up inside an attribute.
  for (const attr of Array.from(node.attributes)) {
    if (attr.value.includes('{math:')) {
      node.setAttribute(
        attr.name,
        attr.value.replace(mathPlaceholderPattern, ''),
      );
    }
  }
});

function targetBlank() {
  function filter(text: string) {
    return text.replace(/<a href=/g, '<a target="_blank" href=');
  }
  return [{ type: 'output', filter }];
}

let converter: showdown.Converter;

function renderMarkdown(markdown: string) {
  if (!converter) {
    // see https://github.com/showdownjs/showdown#valid-options
    converter = new showdown.Converter({
      extensions: [targetBlank],
      simplifiedAutoLink: true,
      excludeTrailingPunctuationFromURLs: true,
      // Since we're using simplifiedAutoLink we also use
      // literalMidWordUnderscores because otherwise _'s in URLs get
      // transformed into <em>'s.
      // See https://github.com/showdownjs/showdown/issues/211
      literalMidWordUnderscores: true,
      // Enable strikethrough, which is disabled by default
      strikethrough: true,
    });
  }
  return converter.makeHtml(markdown);
}

function mathPlaceholder(id: number) {
  return '{math:' + id.toString() + '}';
}

type MathBlock = {
  id: number;
  inline: boolean;
  expression: string;
};

/**
 * Parses a string containing mixed markdown and LaTeX in between
 * '$$..$$' or '\( ... \)' delimiters and returns an object containing a
 * list of math blocks found in the string, plus the input string with math
 * blocks replaced by placeholders.
 */
function extractMath(content: string): {
  content: string;
  mathBlocks: MathBlock[];
} {
  const mathBlocks: MathBlock[] = [];
  let pos = 0;
  let replacedContent = content;

  while (true) {
    const blockMathStart = replacedContent.indexOf('$$', pos);
    const inlineMathStart = replacedContent.indexOf('\\(', pos);

    if (blockMathStart === -1 && inlineMathStart === -1) {
      break;
    }

    let mathStart;
    let mathEnd;
    if (
      blockMathStart !== -1 &&
      (inlineMathStart === -1 || blockMathStart < inlineMathStart)
    ) {
      mathStart = blockMathStart;
      mathEnd = replacedContent.indexOf('$$', mathStart + 2);
    } else {
      mathStart = inlineMathStart;
      mathEnd = replacedContent.indexOf('\\)', mathStart + 2);
    }

    if (mathEnd === -1) {
      break;
    } else {
      mathEnd = mathEnd + 2;
    }

    const id = mathBlocks.length + 1;
    const placeholder = mathPlaceholder(id);
    mathBlocks.push({
      id,
      expression: replacedContent.slice(mathStart + 2, mathEnd - 2),
      inline: inlineMathStart !== -1,
    });

    let replacement;
    if (inlineMathStart !== -1) {
      replacement = placeholder;
    } else {
      // Add new lines before and after math blocks so that they render
      // as separate paragraphs
      replacement = '\n\n' + placeholder + '\n\n';
    }

    replacedContent =
      replacedContent.slice(0, mathStart) +
      replacement +
      replacedContent.slice(mathEnd);
    pos = mathStart + replacement.length;
  }

  return {
    mathBlocks,
    content: replacedContent,
  };
}

function insertMath(html: string, mathBlocks: MathBlock[]) {
  return mathBlocks.reduce((html, block) => {
    let renderedMath;
    try {
      if (block.inline) {
        renderedMath = katex.renderToString(block.expression);
      } else {
        renderedMath = katex.renderToString(block.expression, {
          displayMode: true,
        });
      }
    } catch {
      renderedMath = escapeHTML(block.expression);
    }
    // Use a function as the replacement, so that "$" sequences in the rendered
    // math (eg. "$`") are not treated as replacement patterns.
    return html.replace(mathPlaceholder(block.id), () => renderedMath);
  }, html);
}

/**
 * Convert a string of markdown and math into sanitized HTML.
 *
 * Math expressions in the input are written as LaTeX and must be enclosed in
 * `$$ .. $$` or `\( .. \)` delimiters to indicate block or inline math
 * expressions. These expressions are extracted and rendered using KaTeX.
 *
 * @return - A string of sanitized HTML.
 */
export function renderMathAndMarkdown(markdown: string): string {
  // KaTeX takes care of escaping its input, so we want to avoid passing its
  // output through the HTML sanitizer. Therefore we first extract the math
  // blocks from the input, render and sanitize the remaining markdown and then
  // render and re-insert the math blocks back into the output.
  const mathInfo = extractMath(markdown);
  const markdownHTML = DOMPurify.sanitize(renderMarkdown(mathInfo.content), {
    FORBID_TAGS: FORBIDDEN_TAGS,
    FORBID_ATTR: FORBIDDEN_ATTRS,
  });
  const mathAndMarkdownHTML = insertMath(markdownHTML, mathInfo.mathBlocks);
  return mathAndMarkdownHTML;
}
