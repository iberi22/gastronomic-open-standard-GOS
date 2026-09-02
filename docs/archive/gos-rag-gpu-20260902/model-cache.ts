/**
 * Utility helper to manage local WebGPU model caching, metadata, and status.
 */

export const DEFAULT_MODEL = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";
export const MODEL_SIZE_ESTIMATE = "1.65 GB";

export interface ModelMetadata {
  id: string;
  name: string;
  size: string;
  quantization: string;
  description: string;
}

export const SUPPORTED_MODELS: ModelMetadata[] = [
  {
    id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    name: "Qwen 2.5 1.5B Instruct (Q4)",
    size: "1.65 GB",
    quantization: "q4f16_1 (4-bit quantized)",
    description: "Highly compact, ultra-fast model with great instruction-following capabilities. Highly recommended for mobile & web browser use."
  },
  {
    id: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
    name: "Llama 3.2 1B Instruct (Q4)",
    size: "1.15 GB",
    quantization: "q4f16_1 (4-bit quantized)",
    description: "Slightly smaller, excellent general-purpose reasoning model."
  }
];

export async function isModelCached(modelId: string = DEFAULT_MODEL): Promise<boolean> {
  if (typeof caches === 'undefined') return false;
  try {
    const cacheKeys = await caches.keys();
    for (const key of cacheKeys) {
      if (key.includes('webllm') || key.includes('mlc') || key.includes('wasm')) {
        const cache = await caches.open(key);
        const requests = await cache.keys();
        if (requests.length > 0) {
          const matches = requests.some(req => req.url.includes(modelId));
          if (matches) return true;
        }
      }
    }
  } catch (err) {
    console.error("Error checking model cache:", err);
  }
  return false;
}

export async function getCacheStats() {
  if (typeof caches === 'undefined') return { count: 0, sizeMB: 0 };
  let totalSize = 0;
  let fileCount = 0;
  try {
    const keys = await caches.keys();
    for (const key of keys) {
      if (key.includes('webllm') || key.includes('mlc') || key.includes('wasm')) {
        const cache = await caches.open(key);
        const requests = await cache.keys();
        fileCount += requests.length;
        for (const req of requests) {
          const res = await cache.match(req);
          if (res) {
            const cl = res.headers.get('content-length');
            if (cl) {
              totalSize += parseInt(cl, 10);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("Error reading cache stats:", err);
  }
  return {
    count: fileCount,
    sizeMB: Math.round(totalSize / (1024 * 1024))
  };
}

export async function clearModelCache(): Promise<boolean> {
  if (typeof caches === 'undefined') return false;
  try {
    const keys = await caches.keys();
    let deletedAny = false;
    for (const key of keys) {
      if (key.includes('webllm') || key.includes('mlc') || key.includes('wasm')) {
        await caches.delete(key);
        deletedAny = true;
      }
    }
    return deletedAny;
  } catch (err) {
    console.error("Error clearing model cache:", err);
    return false;
  }
}
