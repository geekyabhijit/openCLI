/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// Local Qwen Models (LM Studio)
export const DEFAULT_QWEN_MODEL = 'qwen3-30b-a3b-dwq-05082025';
export const DEFAULT_LOCAL_ENDPOINT = 'http://127.0.0.1:1234';

// Legacy Gemini Models (for fallback compatibility)
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-pro';
export const DEFAULT_GEMINI_FLASH_MODEL = 'gemini-2.5-flash';
export const DEFAULT_GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001';

// Model capabilities configuration
export const MODEL_CAPABILITIES = {
  'qwen3-30b-a3b': {
    contextWindow: 131072,
    supportsThinking: true,
    supportsTools: true,
    isLocal: true,
    provider: 'lm-studio'
  },
  'qwen3-30b-a3b-dwq-05082025': {
    contextWindow: 131072,
    supportsThinking: true,
    supportsTools: true,
    isLocal: true,
    provider: 'lm-studio'
  },
  'gemini-2.5-pro': {
    contextWindow: 1048576,
    supportsThinking: true,
    supportsTools: true,
    isLocal: false,
    provider: 'google'
  }
};

export function isLocalModel(model: string): boolean {
  return MODEL_CAPABILITIES[model as keyof typeof MODEL_CAPABILITIES]?.isLocal ?? false;
}

export function getModelCapabilities(model: string) {
  return MODEL_CAPABILITIES[model as keyof typeof MODEL_CAPABILITIES] || {
    contextWindow: 4096,
    supportsThinking: false,
    supportsTools: true,
    isLocal: false,
    provider: 'unknown'
  };
}
