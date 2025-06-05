#!/bin/bash

# Check for required files
if [ ! -f "wrangler.toml" ]; then
  if [ -f "wrangler.toml.example" ]; then
    cp wrangler.toml.example wrangler.toml
    echo "Copied wrangler.toml.example to wrangler.toml"
    echo "Please edit wrangler.toml with your KV namespace ID"
    exit 1
  else
    echo "Error: wrangler.toml not found and no example file available"
    exit 1
  fi
fi

if [ ! -f "gemini-keys.json" ]; then
  if [ -f "gemini-keys.json.example" ]; then
    cp gemini-keys.json.example gemini-keys.json
    echo "Copied gemini-keys.json.example to gemini-keys.json"
    echo "Please add your Gemini API keys to gemini-keys.json"
    exit 1
  else
    echo "Error: gemini-keys.json not found and no example file available"
    exit 1
  fi
fi

# Validate JSON
if ! jq empty gemini-keys.json 2>/dev/null; then
  echo "Error: gemini-keys.json contains invalid JSON"
  exit 1
fi

# Transform keys into KV bulk format
TMP_FILE=$(mktemp)
jq -r '.keys | to_entries | map({key: ("key_" + (.key|tostring), value: .value}) | from_entries' gemini-keys.json > "$TMP_FILE"

# Execute Wrangler command
wrangler kv:bulk put --binding=GEMINI_KEYS "$TMP_FILE"

# Cleanup
rm "$TMP_FILE"
