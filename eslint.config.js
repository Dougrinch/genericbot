import js from "@eslint/js"
import globals from "globals"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import tseslint from "typescript-eslint"
import {globalIgnores} from "eslint/config"
import stylistic from "@stylistic/eslint-plugin"

const stylisticPreset = stylistic.configs.customize({
  indent: 2,
  quotes: "double",
  semi: false,
  jsx: true,
  braceStyle: "1tbs",
  commaDangle: "never"
})

const presetIndent = stylisticPreset.rules?.["@stylistic/indent"] ?? ["error", 2]
const [lvl, step, opts] = presetIndent

// noinspection JSCheckFunctionSignatures
export default tseslint.config([
  globalIgnores(["dist", "coverage"]),
  {
    plugins: {
      "@stylistic": stylistic
    },
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      {
        languageOptions: {
          parserOptions: {
            projectService: true
          }
        }
      },
      reactHooks.configs["recommended-latest"],
      reactRefresh.configs.vite,
      stylisticPreset
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "@stylistic/indent": [lvl, step, {
        ...opts,
        offsetTernaryExpressions: false
      }],
      "@stylistic/jsx-one-expression-per-line": ["error", {"allow": "non-jsx"}],
      "@stylistic/no-multiple-empty-lines": ["error", {"max": 2, "maxEOF": 0, "maxBOF": 0}],
      "@stylistic/arrow-parens": ["error", "as-needed"],
      "@stylistic/spaced-comment": "off",
      "@typescript-eslint/strict-boolean-expressions": "error",
      "eqeqeq": ["error", "smart"]
    }
  }
])
