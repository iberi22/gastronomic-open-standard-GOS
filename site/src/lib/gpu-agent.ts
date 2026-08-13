import { CreateWebWorkerMLCEngine, type WebWorkerMLCEngine, type InitProgressReport, type ChatCompletionMessageParam } from "@mlc-ai/web-llm";
import { DEFAULT_MODEL } from "./model-cache";

export type ProgressCallback = (progress: {
  percent: number;
  message: string;
}) => void;

let engineInstance: WebWorkerMLCEngine | null = null;
let currentModelId: string | null = null;

/**
 * Initializes the WebGPU Web Worker LLM engine.
 * Disposes previous engine if model changes.
 */
export async function getOrInitGPUEngine(
  modelId: string = DEFAULT_MODEL,
  onProgress?: ProgressCallback
): Promise<WebWorkerMLCEngine> {
  if (typeof navigator === 'undefined' || !navigator.gpu) {
    throw new Error("WebGPU is not supported or not enabled in this browser.");
  }

  if (engineInstance && currentModelId === modelId) {
    return engineInstance;
  }

  if (engineInstance) {
    try {
      await engineInstance.unload();
    } catch (e) {
      console.warn("Error unloading previous model:", e);
    }
    engineInstance = null;
  }

  const worker = new Worker(
    new URL("./gpu-agent.worker.ts", import.meta.url),
    { type: "module" }
  );

  const initProgressCallback = (report: InitProgressReport) => {
    const percent = Math.round((report.progress || 0) * 100);
    const message = report.text || "Loading model weights...";
    if (onProgress) {
      onProgress({ percent, message });
    }
  };

  try {
    const engine = await CreateWebWorkerMLCEngine(
      worker,
      modelId,
      {
        initProgressCallback,
        appConfig: {
          cacheBackend: "cache"
        }
      }
    );

    engineInstance = engine;
    currentModelId = modelId;
    return engine;
  } catch (error) {
    console.error("Failed to initialize WebGPU WebWorker engine:", error);
    throw error;
  }
}

/**
 * Checks if WebGPU is supported on the current device.
 */
export function isWebGPUSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.gpu;
}

/**
 * Streams chat response from the WebGPU LLM engine.
 */
export async function* streamGPUCompletion(
  messages: ChatCompletionMessageParam[],
  options?: {
    temperature?: number;
    max_tokens?: number;
    modelId?: string;
    onProgress?: ProgressCallback;
  }
) {
  const modelId = options?.modelId || DEFAULT_MODEL;
  const engine = await getOrInitGPUEngine(modelId, options?.onProgress);

  const chatOpts: any = {
    messages,
    stream: true,
    temperature: options?.temperature ?? 0.7,
  };

  if (options?.max_tokens) {
    chatOpts.max_tokens = options.max_tokens;
  }

  const completion = await engine.chat.completions.create(chatOpts);

  for await (const chunk of completion) {
    const content = chunk.choices[0]?.delta?.content || "";
    if (content) {
      yield content;
    }
  }
}
