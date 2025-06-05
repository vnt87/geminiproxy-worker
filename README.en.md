[Tiếng Việt](README.md) | [English](README.en.md)

# Gemini API Proxy Worker for Cloudflare

This project implements a Cloudflare Worker that acts as a reverse proxy for Google's Gemini API. It provides automatic API key rotation using Cloudflare KV store for persistence.

This is a TypeScript conversion of the original Go-based `geminiproxy` project, adapted to run on Cloudflare's serverless edge network.

## Repository

This project is hosted at: https://github.com/vnt87/gemini-proxy-worker.git

## Features

-   Proxies requests to the Gemini API (`generativelanguage.googleapis.com`).
-   Automatically rotates through multiple Gemini API keys in a round-robin fashion.
-   API keys are stored securely in Cloudflare KV.
-   Stateless architecture suitable for Cloudflare Workers.
-   Transparent to clients – they make requests to the Worker URL as if it were the Gemini API (after initial setup).
-   LiteLLM compatibility (removes `Authorization` header).

## Prerequisites

-   A Cloudflare account.
-   `npm` and `Node.js` installed.
-   Wrangler CLI installed (`npm install -g wrangler`).
-   One or more Gemini API keys.

## Setup

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/vnt87/gemini-proxy-worker.git
    cd gemini-proxy-worker
    ```
    *(If you are initializing this project from existing local files and want to connect to this remote, use `git remote add origin https://github.com/vnt87/gemini-proxy-worker.git` after `git init`)*

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Create KV Namespace:**
    In your terminal, run:
    ```bash
    wrangler kv:namespace create GEMINI_KEYS
    ```
    This command will output an `id`. Note this ID.

4.  **Configure `wrangler.toml`:**
    Open `wrangler.toml` and update the `kv_namespaces` section with the `id` you obtained:
    ```toml
    kv_namespaces = [
      { binding = "GEMINI_KEYS", id = "YOUR_ACTUAL_KV_NAMESPACE_ID" }
    ]
    ```

5.  **Prepare and Upload API Keys:**
    a.  Create a JSON file named `gemini-keys.json` (or use `gemini-keys.json.example` as a template) in the `geminiproxy-worker` directory. It should contain your Gemini API keys:
        ```json
        // gemini-keys.json
        {
          "keys": [
            "AIzaSyA...key1",
            "AIzaSyB...key2",
            "AIzaSyC...key3"
          ]
        }
        ```
        **Important:** Ensure `gemini-keys.json` is listed in your `.gitignore` file to prevent committing your actual keys. A `gemini-keys.json.example` is provided.

    b.  Upload this file to your KV namespace. The key manager expects the keys to be stored under the KV key `GEMINI_API_KEYS_CONFIG`.
        ```bash
        wrangler kv:key put --binding=GEMINI_KEYS "GEMINI_API_KEYS_CONFIG" --path="./gemini-keys.json"
        ```
        *Note: Ensure `wrangler.toml` is correctly configured with the `GEMINI_KEYS` binding before running this.*

## Usage

### Local Development

To test the Worker locally:
```bash
wrangler dev
```
This will start a local server (typically `http://localhost:8787`). You can send requests to this endpoint as if it were the Gemini API. For example, if the Gemini API endpoint is `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent`, you would send your request to `http://localhost:8787/v1beta/models/gemini-pro:generateContent`.

The Worker will append the rotated API key to the request.

### Deployment

To deploy the Worker to your Cloudflare account:
```bash
wrangler deploy
```
After deployment, Wrangler will provide you with the URL of your deployed Worker (e.g., `https://geminiproxy-worker.<your-subdomain>.workers.dev`). Use this URL as your Gemini API endpoint in your client applications.

## Debugging

To view real-time logs from your deployed worker:
```bash
npx wrangler tail
```
This will stream logs from your production worker, showing:
- Requests and responses
- Errors
- Key rotation events
- KV store operations

Press Ctrl+C to stop the log stream.

## How It Works

1.  A client sends a request to the Cloudflare Worker URL.
2.  The Worker's `fetch` handler receives the request.
3.  The `KeyManager` retrieves the list of API keys and the current rotation index from the `GEMINI_KEYS` KV namespace.
4.  It selects the next API key in a round-robin fashion and updates the index in KV for the next request.
5.  The Worker forwards the original request to the actual Gemini API endpoint (`https://generativelanguage.googleapis.com`), appending the selected API key as a query parameter.
6.  The response from the Gemini API is streamed back to the client through the Worker.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any bugs, features, or improvements.

## License

MIT
