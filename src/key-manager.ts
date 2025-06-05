// src/key-manager.ts

import { Env, ApiKeyConfig, KeyRotationState } from './types';

// Name of the KV key that stores the list of API keys
const KV_API_KEYS_CONFIG_KEY = 'GEMINI_API_KEYS_CONFIG';
// Name of the KV key that stores the current index for round-robin
const KV_ROTATION_STATE_KEY = 'GEMINI_KEY_ROTATION_STATE';

/**
 * Retrieves the list of API keys from KV storage.
 * @param env - The Worker environment containing the KV namespace.
 * @returns A promise that resolves to an array of API key strings, or null if not found/error.
 */
async function getApiKeysFromKV(env: Env): Promise<string[] | null> {
  try {
    const storedKeys = await env.GEMINI_KEYS.get<ApiKeyConfig>(KV_API_KEYS_CONFIG_KEY, { type: 'json' });
    if (storedKeys && Array.isArray(storedKeys.keys) && storedKeys.keys.length > 0) {
      return storedKeys.keys;
    }
    console.error('No API keys found or invalid format in KV store under key:', KV_API_KEYS_CONFIG_KEY);
    return null;
  } catch (error) {
    console.error('Error fetching API keys from KV:', error);
    return null;
  }
}

/**
 * Retrieves the current rotation state (index) from KV.
 * @param env - The Worker environment.
 * @returns A promise that resolves to the current index, or 0 if not found/error.
 */
async function getCurrentRotationIndex(env: Env): Promise<number> {
  try {
    const state = await env.GEMINI_KEYS.get<KeyRotationState>(KV_ROTATION_STATE_KEY, { type: 'json' });
    return state?.currentIndex ?? 0;
  } catch (error) {
    console.error('Error fetching key rotation state from KV:', error);
    return 0; // Default to 0 on error
  }
}

/**
 * Updates the rotation state (index) in KV.
 * @param env - The Worker environment.
 * @param newIndex - The new index to store.
 */
async function updateRotationIndex(env: Env, newIndex: number): Promise<void> {
  try {
    await env.GEMINI_KEYS.put(KV_ROTATION_STATE_KEY, JSON.stringify({ currentIndex: newIndex }));
  } catch (error) {
    console.error('Error updating key rotation state in KV:', error);
  }
}

/**
 * KeyManager class handles the retrieval and rotation of API keys
 * using Cloudflare KV for persistence in a stateless environment.
 */
export class KeyManager {
  private env: Env;
  private apiKeys: string[] | null = null;
  private currentKeyIndex: number = 0;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Initializes the KeyManager by loading keys and the current index from KV.
   * This should be called before getNextKey.
   */
  async initialize(): Promise<void> {
    this.apiKeys = await getApiKeysFromKV(this.env);
    if (this.apiKeys && this.apiKeys.length > 0) {
      this.currentKeyIndex = await getCurrentRotationIndex(this.env);
      // Ensure index is within bounds
      if (this.currentKeyIndex >= this.apiKeys.length || this.currentKeyIndex < 0) {
        this.currentKeyIndex = 0;
        await updateRotationIndex(this.env, this.currentKeyIndex);
      }
    } else {
      // Handle case where no keys are loaded
      console.error("KeyManager initialization failed: No API keys loaded.");
    }
  }

  /**
   * Gets the next API key in a round-robin fashion.
   * It updates the index in KV store for persistence across requests.
   * @returns A promise that resolves to the next API key string, or null if no keys are available.
   */
  async getNextKey(): Promise<string | null> {
    if (!this.apiKeys || this.apiKeys.length === 0) {
      console.error('No API keys available in KeyManager.');
      // Attempt to re-initialize in case keys were added to KV after worker start
      await this.initialize();
      if (!this.apiKeys || this.apiKeys.length === 0) {
        return null;
      }
    }

    const key = this.apiKeys[this.currentKeyIndex];
    
    // Update index for next rotation
    const nextIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    await updateRotationIndex(this.env, nextIndex);
    this.currentKeyIndex = nextIndex; // Update local state for immediate subsequent calls within same invocation (though less likely)

    // For logging, you might want to avoid logging the full key or parts of it in production
    console.log(`Using API key ending with ...${key.slice(-4)} (index: ${this.currentKeyIndex === 0 ? this.apiKeys.length -1 : this.currentKeyIndex -1})`);
    return key;
  }

  /**
   * Manually forces a refresh of keys and rotation state from KV.
   * Useful if keys are updated in KV while the worker is running.
   */
  async refreshKeys(): Promise<void> {
    console.log('Refreshing API keys and rotation state from KV...');
    await this.initialize();
  }
}
