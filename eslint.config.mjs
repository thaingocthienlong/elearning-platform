import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored/generated assets that are not app source and can exceed Node's
    // lint heap when parsed by Babel/ESLint.
    "public/zoom/**",
    "public/lib/zoom/**",
    "zoom-webapp/**",
    "scripts/packager/node_modules/**",
    "Shaka Packager Script/**",
    "archive/**",
  ]),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "react/no-unescaped-entities": "off",
    },
  },
]);

export default eslintConfig;
