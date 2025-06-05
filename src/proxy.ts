// src/proxy.ts

import { Env } from './types';
import { KeyManager } from './key-manager';

// The target Gemini API endpoint
const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com';

/**
 * Handles incoming requests, proxies them to the Gemini API with an API key.
 * @param request - The incoming Request object.
 * @param env - The Worker environment, including KV bindings.
 * @param ctx - The execution context of the Worker.
 * @returns A Promise that resolves to a Response object.
 */
export async function handleProxyRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  // Initialize KeyManager. It's important to do this on each request or
  // manage its lifecycle carefully if you want to reuse instances across requests
  // (though for KV-backed state, re-initializing per request is often simplest).
  const keyManager = new KeyManager(env);
  
  // Ensure KeyManager is initialized (loads keys and current index from KV)
  // Using ctx.waitUntil to allow this async operation to complete
  // even if we return a response earlier or if an error occurs.
  // This is crucial for KV writes (like updating the index) to reliably complete.
  ctx.waitUntil(keyManager.initialize());
  
  // Get the next API key
  const apiKey = await keyManager.getNextKey();

  if (!apiKey) {
    // If no API key is available (e.g., KV store is empty or inaccessible)
    // return an error response.
    console.error('Failed to retrieve an API key. Check KV store and configuration.');
    return new Response('Proxy error: API key not available.', { status: 500 });
  }

  // Clone the original request to modify its URL
  const originalUrl = new URL(request.url);
  
  // Construct the target URL for the Gemini API
  // It preserves the original path and query parameters from the client request,
  // then adds/overwrites the 'key' parameter.
  const targetUrl = new URL(originalUrl.pathname + originalUrl.search, GEMINI_API_ENDPOINT);
  targetUrl.searchParams.set('key', apiKey); // Add the API key

  // Log the proxying action (optional, consider log levels for production)
  console.log(`Proxying request from ${originalUrl.hostname} to ${targetUrl.toString()}`);
  
  // Create a new Request object for the target API
  // We need to pass through method, headers (potentially modified), and body.
  const proxyRequest = new Request(targetUrl.toString(), {
    method: request.method,
    headers: request.headers, // Pass original headers
    body: request.body,
    redirect: 'manual', // Important for Cloudflare Workers to handle redirects correctly
  });

  // Remove Cloudflare-specific headers before sending to the origin
  // to avoid exposing internal details or causing issues with the target API.
  proxyRequest.headers.delete('cf-connecting-ip');
  proxyRequest.headers.delete('cf-ipcountry');
  proxyRequest.headers.delete('cf-ray');
  proxyRequest.headers.delete('cf-visitor');
  // LiteLLM might send an Authorization header, which Gemini API doesn't use with API keys.
  // The original Go proxy also deleted this.
  proxyRequest.headers.delete('Authorization');


  try {
    // Make the actual request to the Gemini API
    const response = await fetch(proxyRequest);
    
    // Return the response from the Gemini API directly to the client
    // It's good practice to make a mutable copy of headers if you need to modify them.
    const responseHeaders = new Headers(response.headers);
    // Example: Add a custom header to indicate the request was proxied
    responseHeaders.set('X-Gemini-Proxy', 'active');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Error fetching from target API:', error);
    return new Response('Proxy error: Failed to fetch from target API.', { status: 502 }); // Bad Gateway
  }
}
