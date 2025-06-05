// src/index.ts

import { Env } from './types';
import { handleProxyRequest } from './proxy';

/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

// Export a default object containing event handlers.
export default {
  /**
   * Handles incoming fetch events (HTTP requests).
   * This is the main entry point for your Worker.
   * @param request - The incoming Request object.
   * @param env - The Worker environment, including bindings like KV namespaces and secrets.
   * @param ctx - The execution context, providing methods like ctx.waitUntil().
   * @returns A Promise that resolves to a Response object.
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Log the incoming request URL (optional, for debugging)
    console.log(`Incoming request: ${request.method} ${request.url}`);

    // You can add routing logic here if your worker needs to handle different paths
    // or perform different actions based on the request.
    // For this proxy, we'll assume all requests are to be proxied.

    // Pass the request to the proxy handler
    try {
      return await handleProxyRequest(request, env, ctx);
    } catch (e: any) {
      // Catch any unexpected errors from the proxy handler itself
      console.error('Unhandled error in fetch handler:', e.message, e.stack);
      return new Response(`Internal Server Error: ${e.message || 'Unknown error'}`, { status: 500 });
    }
  },

  // Optional: If you need to handle scheduled events (CRON Triggers)
  // async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
  //   // Example: Perform a scheduled task, like refreshing a cache or sending a report
  //   console.log(`Scheduled event triggered: ${event.cron}`);
  //   ctx.waitUntil(doSomeScheduledTask(env));
  // }
};

// async function doSomeScheduledTask(env: Env): Promise<void> {
//   // Implement your scheduled task logic here
//   console.log("Performing scheduled task...");
//   // Example: Refresh API keys if they have a TTL and are stored in KV
//   // const keyManager = new KeyManager(env);
//   // await keyManager.refreshKeys();
// }
