/**
 * Next.js startup hook. Node-only work lives in instrumentation-node.ts; the NEXT_RUNTIME check
 * is replaced at build time, so the edge bundle never pulls in Node modules.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
