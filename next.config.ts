import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Upload de arquivos dos contatos (limite de 10 MB validado no servidor + folga do envelope).
  experimental: { serverActions: { bodySizeLimit: "11mb" } },
};

export default nextConfig;
