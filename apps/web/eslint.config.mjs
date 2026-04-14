import nextConfig from "../../packages/config/eslint/next.mjs";

export default [
  ...nextConfig,
  {
    files: ["**/*.{ts,tsx}"],
  },
];
