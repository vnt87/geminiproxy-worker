// Defines the environment bindings available to the Worker
// These are typically configured in wrangler.toml
export interface Env {
  // KV Namespace binding for storing API keys
  // This binding 'GEMINI_KEYS' must match the one in wrangler.toml
  GEMINI_KEYS: KVNamespace;

  // Example of other environment variables you might add:
  // GEMINI_API_ENDPOINT?: string; // Optional: if you want to make the target API configurable
  // LOG_LEVEL?: string; // Optional: for controlling log verbosity
}

// Represents the structure of the API keys stored in KV
// Assumes keys are stored as a JSON array of strings
export interface ApiKeyConfig {
  keys: string[];
  // Optional: could add metadata like last_rotated_timestamp if needed
}

// Represents the structure for storing the current key index in KV
// This helps in maintaining the round-robin state across stateless Worker invocations
export interface KeyRotationState {
  currentIndex: number;
}
