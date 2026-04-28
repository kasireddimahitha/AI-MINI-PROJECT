import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  transpilePackages: [
    "langchain",
    "@langchain/google-genai",
    "@langchain/community",
    "@langchain/core",
    "@langchain/textsplitters",
    "@anthropic-ai/sdk",
    "zod",
    "zod-to-json-schema",
    "langchain-core",
  ],
};

export default nextConfig;
