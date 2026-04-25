import nextConfig from "../../packages/config/eslint/next.mjs";

export default [
  ...nextConfig,
  {
    files: ["**/*.{ts,tsx}"],
  },
  // E2E test: rilassa `no-explicit-any` (cast pragmatici su Playwright fixtures)
  // e false positive `rules-of-hooks` sul parametro `use` di Playwright fixture extend
  // (eslint-plugin-react-hooks lo confonde con il React hook `use`).
  {
    files: ["e2e/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/rules-of-hooks": "off",
    },
  },
];
