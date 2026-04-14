import baseConfig from "./packages/config/eslint/index.mjs";

export default [
  ...baseConfig,
  {
    files: ["packages/**/*.{ts,tsx}", "verticals/**/*.{ts,tsx}"],
  },
];
