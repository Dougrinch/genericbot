# Generic bot scripting

Scripts can inspect configured element collections and control the page without adding game-specific logic to the bot:

- `elementCount(elements)` returns the current collection size
- `elementAttribute(elements, index, attribute)` reads an attribute from one matched element
- `toNumber(value)` and `abs(value)` provide small, general numeric helpers
- `pressKey(key)` dispatches a `keydown`/`keyup` pair to the page
- `nearestManhattanOffset(targets, origins, xAttribute, yAttribute)` finds the closest 2D pair
- `offsetX(offset)` and `offsetY(offset)` expose the result for custom strategies
- `dominantAxisDirection(offset, up, left, down, right)` maps an offset to a direction, preferring the horizontal axis on ties

## Localized number variables

Variables with type `Number` have independent decimal and thousands separator settings. Both separators support a dot or comma, while the thousands separator can also be disabled. Changing the decimal separator automatically swaps a conflicting thousands separator. The defaults are decimal dot and thousands comma, so values such as `226,407.5` work without extra setup.

## Grid navigation example

For the apple grid, add these two Elements with **Allow multiple** enabled:

- `Apples`: `//*[contains(concat(' ', normalize-space(@class), ' '), ' has-apple ')]`
- `Player Cells`: `//*[contains(concat(' ', normalize-space(@class), ' '), ' player ')]`

Then add a non-periodic Script action. This game-specific script finds the closest apple to any player cell, changes direction only when needed and recalculates every 50 ms:

```
val lastDirection = ""
while (true) {
  val offset = nearestManhattanOffset(apples, playerCells, "data-column", "data-row")
  val direction = dominantAxisDirection(offset, "w", "a", "s", "d")

  if (direction == "") {
    lastDirection = ""
  } else if (direction != lastDirection) {
    pressKey(direction)
    lastDirection = direction
  }
  wait(50)
}
```

For another movement policy, use `offsetX(offset)` and `offsetY(offset)` instead of `dominantAxisDirection`. For a different distance metric or non-coordinate data, the lower-level element functions remain available. Selectors, coordinate attributes, keys and polling interval all live in configuration or the user script.

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
