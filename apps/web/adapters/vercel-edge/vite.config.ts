import { extendConfig } from "@builder.io/qwik-city/vite";
import { vercelEdgeAdapter } from "@builder.io/qwik-city/adapters/vercel-edge/vite";
import baseConfig from "../../vite.config";

export default extendConfig(baseConfig, () => {
  return {
    build: {
      ssr: true,
      outDir: ".vercel/output/functions/_qwik-city.func",
      rollupOptions: {
        input: ["src/entry.vercel-edge.tsx", "@qwik-city-plan"],
      },
    },
    plugins: [vercelEdgeAdapter({ ssg: { include: [] } })],
  };
});
