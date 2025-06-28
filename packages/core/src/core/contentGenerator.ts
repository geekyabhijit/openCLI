console.log('🔧 DEBUG: Loading contentGenerator.ts');

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CountTokensResponse,
  GenerateContentResponse,
  GenerateContentParameters,
  CountTokensParameters,
  EmbedContentResponse,
  EmbedContentParameters,
  GoogleGenAI,
} from '@google/genai';
import { createCodeAssistContentGenerator } from '../code_assist/codeAssist.js';
import { DEFAULT_GEMINI_MODEL, DEFAULT_QWEN_MODEL, DEFAULT_LOCAL_ENDPOINT, isLocalModel } from '../config/models.js';
import { getEffectiveModel } from './modelCheck.js';
import { LocalContentGenerator } from './localContentGenerator.js';

/**
 * Interface abstracting the core functionalities for generating content and counting tokens.
 */
export interface ContentGenerator {
  generateContent(
    request: GenerateContentParameters,
  ): Promise<GenerateContentResponse>;

  generateContentStream(
    request: GenerateContentParameters,
  ): Promise<AsyncGenerator<GenerateContentResponse>>;

  countTokens(request: CountTokensParameters): Promise<CountTokensResponse>;

  embedContent(request: EmbedContentParameters): Promise<EmbedContentResponse>;
}

export enum AuthType {
  LOGIN_WITH_GOOGLE_PERSONAL = 'oauth-personal',
  USE_GEMINI = 'gemini-api-key',
  USE_VERTEX_AI = 'vertex-ai',
  USE_LOCAL_MODEL = 'local-model',
}

export type ContentGeneratorConfig = {
  model: string;
  apiKey?: string;
  vertexai?: boolean;
  authType?: AuthType | undefined;
  localEndpoint?: string;
};

export async function createContentGeneratorConfig(
  model: string | undefined,
  authType: AuthType | undefined,
  config?: { getModel?: () => string },
): Promise<ContentGeneratorConfig> {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const googleApiKey = process.env.GOOGLE_API_KEY;
  const googleCloudProject = process.env.GOOGLE_CLOUD_PROJECT;
  const googleCloudLocation = process.env.GOOGLE_CLOUD_LOCATION;
  const localEndpoint = process.env.LOCAL_MODEL_ENDPOINT || DEFAULT_LOCAL_ENDPOINT;

  // Use runtime model from config if available, otherwise fallback to parameter or default
  const effectiveModel = config?.getModel?.() || model || (authType === AuthType.USE_LOCAL_MODEL ? DEFAULT_QWEN_MODEL : DEFAULT_GEMINI_MODEL);

  const contentGeneratorConfig: ContentGeneratorConfig = {
    model: effectiveModel,
    authType,
    localEndpoint,
  };

  // Auto-detect local models and set auth type
  console.log(`🔧 DEBUG: effectiveModel=${effectiveModel}, isLocalModel=${isLocalModel(effectiveModel)}, authType=${authType}`);
  if (isLocalModel(effectiveModel) || authType === AuthType.USE_LOCAL_MODEL) {
    console.log('🔧 DEBUG: Setting authType to USE_LOCAL_MODEL');
    contentGeneratorConfig.authType = AuthType.USE_LOCAL_MODEL;
    contentGeneratorConfig.localEndpoint = localEndpoint;
    return contentGeneratorConfig;
  }

  // if we are using google auth nothing else to validate for now
  if (authType === AuthType.LOGIN_WITH_GOOGLE_PERSONAL) {
    return contentGeneratorConfig;
  }

  if (authType === AuthType.USE_GEMINI && geminiApiKey) {
    contentGeneratorConfig.apiKey = geminiApiKey;
    contentGeneratorConfig.model = await getEffectiveModel(
      contentGeneratorConfig.apiKey,
      contentGeneratorConfig.model,
    );

    return contentGeneratorConfig;
  }

  if (
    authType === AuthType.USE_VERTEX_AI &&
    !!googleApiKey &&
    googleCloudProject &&
    googleCloudLocation
  ) {
    contentGeneratorConfig.apiKey = googleApiKey;
    contentGeneratorConfig.vertexai = true;
    contentGeneratorConfig.model = await getEffectiveModel(
      contentGeneratorConfig.apiKey,
      contentGeneratorConfig.model,
    );

    return contentGeneratorConfig;
  }

  return contentGeneratorConfig;
}

export async function createContentGenerator(
  config: ContentGeneratorConfig,
): Promise<ContentGenerator> {
  const version = process.env.CLI_VERSION || process.version;
  const httpOptions = {
    headers: {
      'User-Agent': `openCLI/${version} (${process.platform}; ${process.arch})`,
    },
  };

  // Handle local models
  if (config.authType === AuthType.USE_LOCAL_MODEL) {
    console.log('🔧 CREATING LOCAL CONTENT GENERATOR 🔧');
    const localGenerator = new LocalContentGenerator({
      endpoint: config.localEndpoint || DEFAULT_LOCAL_ENDPOINT,
      model: config.model,
      timeout: 30000,
    });
    
    // Test connection on startup
    const isConnected = await localGenerator.checkConnection();
    if (!isConnected) {
      console.warn(`⚠️  Cannot connect to local model at ${config.localEndpoint}`);
      console.warn('   Please ensure LM Studio is running and your model is loaded.');
      console.warn('   Continuing anyway - connection will be retried on first request.');
    } else {
      console.log(`✅ Connected to local model: ${config.model}`);
    }
    
    return localGenerator;
  }

  if (config.authType === AuthType.LOGIN_WITH_GOOGLE_PERSONAL) {
    console.log('🔧 USING CODE ASSIST CONTENT GENERATOR 🔧');
    return createCodeAssistContentGenerator(httpOptions, config.authType);
  }

  if (
    config.authType === AuthType.USE_GEMINI ||
    config.authType === AuthType.USE_VERTEX_AI
  ) {
    console.log('🔧 USING GOOGLE GENAI 🔧');
    const googleGenAI = new GoogleGenAI({
      apiKey: config.apiKey === '' ? undefined : config.apiKey,
      vertexai: config.vertexai,
      httpOptions,
    });

    return googleGenAI.models;
  }

  console.log('🔧 NO MATCHING AUTH TYPE - ERROR 🔧');
  throw new Error(
    `Error creating contentGenerator: Unsupported authType: ${config.authType}`,
  );
}
