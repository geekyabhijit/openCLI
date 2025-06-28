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
  Content,
  Part,
} from '@google/genai';
import { ContentGenerator } from './contentGenerator.js';
import { DEFAULT_LOCAL_ENDPOINT } from '../config/models.js';
import { getCoreSystemPrompt } from './prompts.js';

export interface LocalContentGeneratorConfig {
  endpoint: string;
  model: string;
  timeout?: number;
}

export class LocalContentGenerator implements ContentGenerator {
  private endpoint: string;
  private model: string;
  private timeout: number;

  constructor(config: LocalContentGeneratorConfig) {
    this.endpoint = config.endpoint || DEFAULT_LOCAL_ENDPOINT;
    this.model = config.model;
    this.timeout = config.timeout || 30000; // Back to original 30 seconds
  }

  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.endpoint}/v1/models`, {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async generateContent(
    request: GenerateContentParameters,
  ): Promise<GenerateContentResponse> {
    console.log('🔧 DEBUG: LocalContentGenerator.generateContent called');
    
    // First check if LM Studio is running
    const isConnected = await this.checkConnection();
    if (!isConnected) {
      throw new Error('Cannot connect to LM Studio. Please ensure LM Studio is running on ' + this.endpoint);
    }
    
    try {
      const openAIRequest = this.convertToOpenAIFormat(request);
      
      // Debug logging
      console.log('🔧 DEBUG: Request to local model:', JSON.stringify(Object.assign({}, openAIRequest, {
        stream: false,
      }), null, 2));
      
      const response = await fetch(`${this.endpoint}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(Object.assign({}, openAIRequest, {
          stream: false,
        })),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log('🔧 DEBUG: Error response body:', errorText);
        throw new Error(`Local API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('🔧 DEBUG: Response from local model:', JSON.stringify(data, null, 2));
      return this.convertFromOpenAIFormat(data);
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        console.error('🔧 TIMEOUT: Local model request timed out after', this.timeout, 'ms');
        throw new Error(`Local model request timed out after ${this.timeout/1000} seconds. Try: 1) Reduce request complexity, 2) Increase timeout, 3) Check LM Studio performance`);
      }
      console.error('Error calling local model:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
  }

  async generateContentStream(
    request: GenerateContentParameters,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    console.log('🔧 DEBUG: LocalContentGenerator.generateContentStream called');
    // For now, return a simple async generator that yields the full response
    const fullResponse = await this.generateContent(request);
    
    async function* simpleGenerator() {
      yield fullResponse;
    }
    
    return simpleGenerator();
  }

  async countTokens(request: CountTokensParameters): Promise<CountTokensResponse> {
    // Simple token estimation - can be improved later
    const textLength = JSON.stringify(request).length;
    const estimatedTokens = Math.ceil(textLength / 4);
    
    return {
      totalTokens: estimatedTokens,
    };
  }

  async embedContent(request: EmbedContentParameters): Promise<EmbedContentResponse> {
    throw new Error('Embedding not supported in local mode. Use a dedicated embedding service.');
  }

  private convertToOpenAIFormat(request: GenerateContentParameters): any {
    console.log('🔧 DEBUG: convertToOpenAIFormat called');
    try {
      const messages: any[] = [];

      // Add system prompt for tool usage
      try {
        // Use minimal system prompt for local models
        const systemPrompt = `You are a helpful AI assistant with access to tools. When asked to create files, use the write_file tool. When asked to run commands, use the run_shell_command tool. Use the appropriate tools to complete user requests.`;
        
        messages.push({ role: 'system', content: systemPrompt });
        console.log('🔧 DEBUG: Added comprehensive tool-enabled system prompt for local model');
      } catch (error) {
        console.log('🔧 DEBUG: Error with system prompt:', error);
      }

      if (request.contents) {
        if (typeof request.contents === 'string') {
          messages.push({ role: 'user', content: request.contents });
        } else if (Array.isArray(request.contents)) {
          for (const content of request.contents as Content[]) {
            if (content.role && content.parts) {
              const role = content.role === 'model' ? 'assistant' : content.role;
              const text = content.parts.map((part: Part) => part.text || '').join('\n');
              if (text.trim()) {
                messages.push({ role, content: text });
              }
            }
          }
        }
      }

    const openAIRequest: any = {
      model: this.model,
      messages,
      temperature: 0.7,
      max_tokens: 16384, // Further increased for complex HTML content
      top_p: 0.9,
    };

    if ((request as any).config?.tools && Array.isArray((request as any).config.tools)) {
      const tools: any[] = [];
      console.log(`🔧 DEBUG: Processing ${(request as any).config.tools.length} tool groups`);
      for (const tool of (request as any).config.tools) {
        const declarations = tool.functionDeclarations;
        if (declarations && Array.isArray(declarations)) {
          console.log(`🔧 DEBUG: Found ${declarations.length} function declarations`);
          for (const func of declarations) {
            console.log(`🔧 DEBUG: Processing function: ${func.name}`);
            // Only include essential tools to avoid overwhelming the request
            if (['list_directory', 'read_file', 'search_file_content', 'glob', 'write_file', 'replace', 'run_shell_command'].includes(func.name)) {
              console.log(`🔧 DEBUG: Including tool: ${func.name}`);
              tools.push({
                type: 'function',
                function: {
                  name: func.name,
                  description: func.description,
                  parameters: func.parameters && Object.keys(func.parameters).length > 0
                    ? func.parameters
                    : { type: 'object', properties: {} },
                },
              });
            } else {
              console.log(`🔧 DEBUG: Excluding tool: ${func.name}`);
            }
          }
        }
      }
      if (tools.length > 0) {
        console.log(`🔧 DEBUG: Sending ${tools.length} tools to local model: ${tools.map(t => t.function.name).join(', ')}`);
        openAIRequest.tools = tools;
        openAIRequest.tool_choice = 'auto';
      } else {
        console.log(`🔧 DEBUG: No tools to send to local model`);
      }
    }

    return openAIRequest;
    } catch (error) {
      console.error('Error in convertToOpenAIFormat:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
  }

  private convertFromOpenAIFormat(data: any): GenerateContentResponse {
    const choice = data.choices?.[0];
    const content = choice?.message?.content || '';
    const toolCalls = choice?.message?.tool_calls || [];
    
    console.log('🔧 DEBUG: Converting OpenAI response - content:', content);
    console.log('🔧 DEBUG: Converting OpenAI response - tool_calls:', toolCalls);
    
    // Build parts array with both text and function calls
    const parts: any[] = [];
    
    // Add text content if present
    if (content && content.trim()) {
      parts.push({ text: content });
    }
    
    // Add function calls as parts
    if (toolCalls && toolCalls.length > 0) {
      for (const tc of toolCalls) {
        try {
          console.log(`🔧 DEBUG: Processing tool call: ${tc.function?.name}`);
          console.log(`🔧 DEBUG: Raw arguments length: ${tc.function?.arguments?.length || 0} characters`);
          
          let args = {};
          if (tc.function?.arguments) {
            try {
              args = JSON.parse(tc.function.arguments);
              console.log(`🔧 DEBUG: Successfully parsed arguments for ${tc.function?.name}`);
            } catch (parseError) {
              console.error(`🔧 ERROR: JSON parse failed for ${tc.function?.name}:`, parseError);
              console.error(`🔧 ERROR: First 500 chars of arguments:`, tc.function.arguments.substring(0, 500));
              
              // Try to fix common JSON issues
              let fixedArgs = tc.function.arguments;
              
              // Fix common escaping issues
              fixedArgs = fixedArgs.replace(/\\n/g, '\\\\n');
              fixedArgs = fixedArgs.replace(/\\t/g, '\\\\t');
              fixedArgs = fixedArgs.replace(/\\r/g, '\\\\r');
              
              try {
                args = JSON.parse(fixedArgs);
                console.log(`🔧 DEBUG: Successfully parsed after fixing escaping for ${tc.function?.name}`);
              } catch (secondParseError) {
                console.error(`🔧 ERROR: Still failed after fixes:`, secondParseError);
                // Continue with empty args rather than failing
                args = {};
              }
            }
          }
          
          parts.push({
            functionCall: {
              name: tc.function?.name,
              args: args
            }
          });
          console.log(`🔧 DEBUG: Added function call: ${tc.function?.name}`);
        } catch (e) {
          console.error('🔧 ERROR: Failed to process function call:', tc.function?.name, e);
          // Add the function call anyway with empty args to prevent complete failure
          parts.push({
            functionCall: {
              name: tc.function?.name || 'unknown',
              args: {}
            }
          });
        }
      }
    }
    
    console.log('🔧 DEBUG: Final parts array:', parts);
    
    // Create a simplified response that matches the expected interface
    const response = {
      candidates: [{
        content: {
          parts: parts,
          role: 'model'
        },
        finishReason: choice?.finish_reason || 'STOP',
        index: 0,
        safetyRatings: [],
        citationMetadata: {},
        tokenCount: data.usage?.completion_tokens || 0
      }],
      promptFeedback: {
        safetyRatings: [],
        blockReason: undefined
      },
      usageMetadata: {
        promptTokenCount: data.usage?.prompt_tokens || 0,
        candidatesTokenCount: data.usage?.completion_tokens || 0,
        totalTokenCount: data.usage?.total_tokens || 0
      }
    };

    // Add the missing properties to make it a proper GenerateContentResponse
    return Object.assign(response, {
      text: content,
      data: content,
      functionCalls: undefined, // This is handled in parts now
      executableCode: undefined,
      codeExecutionResult: undefined
    }) as unknown as GenerateContentResponse;
  }
} 