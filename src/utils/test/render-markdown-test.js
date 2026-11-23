import sinon from 'sinon';

import { renderMathAndMarkdown, $imports } from '../render-markdown';

describe('render-markdown', () => {
  let render;
  let fakeRenderToString;
  let fakeEscapeHTML;

  beforeEach(() => {
    fakeRenderToString = sinon.stub().callsFake((input, opts) => {
      if (opts && opts.displayMode) {
        return `math+display:${input}`;
      } else {
        return `math:${input}`;
      }
    });
    fakeEscapeHTML = sinon.stub().returnsArg(0);

    $imports.$mock({
      katex: {
        default: {
          renderToString: fakeRenderToString,
        },
      },
      'escape-html': fakeEscapeHTML,
    });

    render = markdown => renderMathAndMarkdown(markdown);
  });

  afterEach(() => {
    $imports.$restore();
  });

  describe('autolinking', () => {
    it('should autolink URLs', () => {
      assert.equal(
        render('See this link - http://arxiv.org/article'),
        '<p>See this link - <a href="http://arxiv.org/article" target="_blank">' +
          'http://arxiv.org/article</a></p>',
      );
    });

    it("should autolink URLs with _'s in them correctly", () => {
      assert.equal(
        render(
          'See this https://hypothes.is/stream?q=tag:group_test_needs_card',
        ),
        '<p>See this <a ' +
          'href="https://hypothes.is/stream?q=tag:group_test_needs_card" ' +
          'target="_blank">' +
          'https://hypothes.is/stream?q=tag:group_test_needs_card</a></p>',
      );
    });

    ['.', ',', '!', '?'].forEach(symbol => {
      it('should autolink URLs excluding trailing punctuation symbols', () => {
        assert.equal(
          render(`See this link - http://arxiv.org/article${symbol}`),
          '<p>See this link - <a href="http://arxiv.org/article" target="_blank">' +
            `http://arxiv.org/article</a>${symbol}</p>`,
        );
      });
    });
  });

  describe('markdown rendering', () => {
    it('should render markdown', () => {
      assert.equal(
        render('one **two** three'),
        '<p>one <strong>two</strong> three</p>',
      );
    });

    it('should sanitize the result', () => {
      // Check that the rendered HTML is fed through the HTML sanitization
      // library. This is not an extensive test of sanitization behavior, that
      // is left to DOMPurify's tests.
      assert.equal(
        renderMathAndMarkdown('one **two** <script>alert("three")</script>'),
        '<p>one <strong>two</strong> </p>',
      );
    });

    it('should open links in a new window', () => {
      assert.equal(
        renderMathAndMarkdown('<a href="http://example.com">test</a>'),
        '<p><a href="http://example.com" target="_blank">test</a></p>',
      );
    });

    it('should render strikethrough', () => {
      assert.equal(
        renderMathAndMarkdown('This is ~~no longer the case~~'),
        '<p>This is <del>no longer the case</del></p>',
      );
    });
  });

  describe('sanitization', () => {
    const renderToElement = markdown => {
      const container = document.createElement('div');
      container.innerHTML = render(markdown);
      return container;
    };

    it('removes forms but keeps their controls', () => {
      const el = renderToElement(
        '<form action="https://example.com/collect" method="post">' +
          '<input type="password" name="user"><button>Log in</button></form>',
      );
      assert.isNull(el.querySelector('form'));
      assert.equal(el.querySelector('input[name=user]').type, 'text');
      assert.isNotNull(el.querySelector('button'));
    });

    it('removes attributes that submit to an external target', () => {
      const el = renderToElement(
        'a <button form="search" formaction="https://example.com">Go</button>',
      );
      const button = el.querySelector('button');
      assert.isFalse(button.hasAttribute('form'));
      assert.isFalse(button.hasAttribute('formaction'));
    });

    ['password', 'PASSWORD', ' password '].forEach(type => {
      it('converts password inputs to text inputs', () => {
        const el = renderToElement(`<input type="${type}" name="p">`);
        assert.equal(el.querySelector('input').type, 'text');
      });
    });

    [
      'text <style>body { display: none }</style>',
      '<svg><style>* { display: none }</style></svg>',
    ].forEach(markdown => {
      it('removes `<style>` elements and their content', () => {
        const el = renderToElement(markdown);
        assert.isNull(el.querySelector('style'));
        assert.notInclude(el.textContent, 'display');
      });
    });

    it('removes `<dialog>` elements but keeps their content', () => {
      const el = renderToElement('<dialog open>Session expired</dialog>');
      assert.isNull(el.querySelector('dialog'));
      assert.include(el.textContent, 'Session expired');
    });

    [
      [
        '<audio autoplay controls src="https://example.com/a.mp3"></audio>',
        'autoplay',
      ],
      [
        '<video autoplay controls src="https://example.com/a.mp4"></video>',
        'autoplay',
      ],
      ['<div class="fixed inset-0 z-max">Overlay</div>', 'class'],
      ['<div popover id="p">Overlay</div>', 'popover'],
      [
        'a <button popovertarget="p" popovertargetaction="show">Show</button>',
        'popovertarget',
      ],
      [
        'a <button popovertarget="p" popovertargetaction="show">Show</button>',
        'popovertargetaction',
      ],
      [
        'a <button command="show-modal" commandfor="d">Show</button>',
        'command',
      ],
      [
        'a <button command="show-modal" commandfor="d">Show</button>',
        'commandfor',
      ],
      [
        '<svg overflow="visible"><rect width="10" height="10"/></svg>',
        'overflow',
      ],
    ].forEach(([markdown, attr]) => {
      it(`removes "${attr}" attribute`, () => {
        const el = renderToElement(markdown);
        assert.equal(el.querySelectorAll(`[${attr}]`).length, 0);
        assert.equal(
          el.querySelectorAll('audio[controls], video[controls]').length,
          markdown.includes('controls') ? 1 : 0,
        );
      });
    });

    [
      'position: fixed; top: 0; left: 0; width: 100%; height: 100%',
      'position: absolute; inset: 0',
      'position: relative; top: -500px; transform: translateY(-500px); z-index: 999',
      'translate: 0 -500px; scale: 20; rotate: 10deg',
      'margin: -400px',
      'margin-top: calc(-1 * 400px)',
      'margin-inline-start: -400px',
      'text-indent: -400px',
      'vertical-align: 400px',
      'box-shadow: 0 0 0 9999px white',
      'outline: 9999px solid white',
      'border-image: linear-gradient(white, white) 1; border-image-outset: 999px',
      'text-shadow: 0 -300px 0 black',
      'margin: var(--some-app-variable)',
      '--custom: 1',
      'position: fixed !important',
      'POSITION: FIXED',
    ].forEach(css => {
      it(`removes inline styles that can cover other content (${css})`, () => {
        const el = renderToElement(
          `<div style="${css}; color: red">Test</div>`,
        );
        const style = el.querySelector('div').style;
        assert.equal(style.color, 'red');
        const remaining = Array.from(style).filter(
          prop => !['color', 'width', 'height'].includes(prop),
        );
        assert.deepEqual(remaining, []);
      });
    });

    it('removes `style` attribute if no styles are allowed', () => {
      const el = renderToElement('<div style="position: fixed">Test</div>');
      assert.isFalse(el.querySelector('div').hasAttribute('style'));
    });

    it('removes disallowed styles from SVG elements', () => {
      const el = renderToElement(
        '<svg style="overflow: visible; position: fixed; width: 10px"></svg>',
      );
      assert.deepEqual(Array.from(el.querySelector('svg').style), ['width']);
    });

    it('removes `style` attribute from elements with no `style` property', () => {
      // Simulate older browsers, where MathML elements have no `style`.
      const styleStub = sinon
        .stub(MathMLElement.prototype, 'style')
        .get(() => undefined);
      try {
        const el = renderToElement(
          '<math><mi style="position: fixed; color: red">x</mi></math>',
        );
        assert.isFalse(el.querySelector('mi').hasAttribute('style'));
      } finally {
        styleStub.restore();
      }
    });

    it('keeps inline styles used for visual formatting', () => {
      const el = renderToElement(
        '<div style="border: 1px solid #ccc; border-radius: 6px; padding: 12px; ' +
          'margin: 4px auto; background: #fafafa; color: #333; font-weight: bold; ' +
          'text-align: center; max-height: 100px; overflow: auto; width: 50%">' +
          'Instructions</div>',
      );
      const style = el.querySelector('div').style;
      assert.equal(style.borderTopWidth, '1px');
      assert.equal(style.borderTopLeftRadius, '6px');
      assert.equal(style.paddingLeft, '12px');
      assert.equal(style.marginTop, '4px');
      assert.equal(style.marginLeft, 'auto');
      assert.equal(style.backgroundColor, 'rgb(250, 250, 250)');
      assert.equal(style.color, 'rgb(51, 51, 51)');
      assert.equal(style.fontWeight, 'bold');
      assert.equal(style.textAlign, 'center');
      assert.equal(style.maxHeight, '100px');
      assert.equal(style.overflowY, 'auto');
      assert.equal(style.width, '50%');
    });

    it('keeps `!important` on allowed styles', () => {
      const el = renderToElement('<p style="color: red !important">Test</p>');
      assert.equal(
        el.querySelector('p').style.getPropertyPriority('color'),
        'important',
      );
    });

    it('keeps collapsible sections', () => {
      const el = renderToElement(
        '<details><summary>Answer</summary>Forty-two</details>',
      );
      assert.equal(el.querySelector('details > summary').textContent, 'Answer');
    });

    it('keeps media with controls', () => {
      const el = renderToElement(
        '<video controls src="https://example.com/a.mp4"></video>',
      );
      const video = el.querySelector('video');
      assert.isTrue(video.hasAttribute('controls'));
      assert.equal(video.getAttribute('src'), 'https://example.com/a.mp4');
    });

    it('keeps inline SVG', () => {
      const el = renderToElement(
        '<svg width="16" height="16" viewBox="0 0 16 16">' +
          '<path d="M1 1h14v14H1z" fill="currentColor"/></svg>',
      );
      assert.isNotNull(el.querySelector('svg[viewBox] > path[d][fill]'));
    });

    it('keeps cosmetic form controls', () => {
      const el = renderToElement(
        '<input type="checkbox" checked> Done ' +
          '<textarea rows="3">output</textarea> ' +
          '<select><option>One</option></select>',
      );
      assert.isTrue(el.querySelector('input[type=checkbox]').checked);
      assert.equal(el.querySelector('textarea').value, 'output');
      assert.isNotNull(el.querySelector('select > option'));
    });
  });

  describe('math blocks', () => {
    it('should render LaTeX blocks', () => {
      assert.equal(render('$$x*2$$'), '<p>math+display:x*2</p>');
    });

    it('should render mixed blocks', () => {
      assert.equal(
        render('one $$x*2$$ two $$x*3$$ three'),
        '<p>one </p>\n<p>math+display:x*2</p>\n' +
          '<p>two </p>\n<p>math+display:x*3</p>\n<p>three</p>',
      );
    });

    it('should not sanitize math renderer output', () => {
      // Check that KaTeX's rendered output is not corrupted in any way by
      // sanitization.
      const html = render('$$ <unknown-tag>foo</unknown-tag> $$');
      assert.include(html, '<unknown-tag>foo</unknown-tag>');
    });

    it('should render mixed inline and block math', () => {
      assert.equal(
        render('one \\(x*2\\) three $$x*3$$'),
        '<p>one math:x*2 three </p>\n<p>math+display:x*3</p>',
      );
    });

    [{ throws: true }, { throws: false }].forEach(({ throws }) => {
      it('escapes HTML when katex throws', () => {
        if (throws) {
          fakeRenderToString.throws(new Error(''));
        }
        render('$$x*2$$');

        if (throws) {
          assert.calledWith(fakeEscapeHTML, 'x*2');
        } else {
          assert.notCalled(fakeEscapeHTML);
        }
      });
    });

    ['$`', "$'", '$&', '$$'].forEach(pattern => {
      it('does not treat "$" sequences in rendered math as replacement patterns', () => {
        fakeRenderToString.returns(`math:${pattern}`);
        assert.equal(
          render('before \\(x\\) after'),
          `<p>before math:${pattern} after</p>`,
        );
      });
    });

    it('does not render math inside attributes', () => {
      fakeRenderToString.returns('<span class="katex">x</span>');
      const html = render(
        '<a id="x onerror=alert(1)//">a</a><img src="x" alt="\\(x\\)">',
      );

      const container = document.createElement('div');
      container.innerHTML = html;
      const img = container.querySelector('img');
      assert.deepEqual(
        Array.from(img.attributes).map(attr => attr.name),
        ['src', 'alt'],
      );
      assert.equal(img.alt, '');
      assert.isNull(container.querySelector('.katex'));
    });

    ['$$x*2', 'x*2$$'].forEach(markdown => {
      it('keeps partially wrapped math blocks unchanged', () => {
        assert.equal(render(markdown), `<p>${markdown}</p>`);
      });
    });
  });

  describe('inline math', () => {
    it('should render inline LaTeX', () => {
      assert.equal(render('\\(x*2\\)'), '<p>math:x*2</p>');
    });

    it('should render mixed inline LaTeX blocks', () => {
      assert.equal(
        render('one \\(x+2\\) two \\(x+3\\) four'),
        '<p>one math:x+2 two math:x+3 four</p>',
      );
    });
  });
});
