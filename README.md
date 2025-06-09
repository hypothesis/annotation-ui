# `@hypothesis/annotation-ui`

UI components to simplify rendering Hypothesis annotation cards in Preact + Tailwind-based applications.

### Installation

Your project must have `preact` and `tailwindcss` as dependencies.

```sh
$ yarn add preact tailwindcss
$ yarn add @hypothesis/annotation-ui
```

### tailwindcss configuration

Update your project's tailwind configuration:

```js
export default {
  content: [
    // Be sure to add this project's component source to your
    // tailwind content globs
    './node_modules/@hypothesis/annotation-ui',
  ],
  // ...
```

## Usage

```js
import { MarkdownView, StyledText } from '@hypothesis/annotation-ui';
```
