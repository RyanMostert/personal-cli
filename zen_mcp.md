# Setting Up the OpenCode Zen Gateway MCP Server

This guide outlines the steps to configure your CLI assistant to use the OpenCode Zen Gateway as an MCP (Multi-Context Provider) server.

---

## 1. Prerequisites
- **Access to OpenCode Zen Gateway:**
    - API endpoint URL (e.g., `https://zen-gateway.opencode.com/api/v1`)
    - API key/token (usually provided by your administrator)
- **Your CLI tool installed and working (with pnpm, Node.js, and necessary configs)**

---

## 2. Quick Setup via CLI

### **Option A: Using the /zen Command (Recommended)**

1. Start your CLI tool:
   ```bash
   pcli
   ```

2. Configure Zen Gateway:
   ```
   /zen add
   ```
   This will open the MCP wizard with Zen Gateway presets pre-filled.

3. Enter your API key when prompted (or ensure `OPENCODE_API_KEY` env var is set).

4. Verify the connection:
   ```
   /zen status
   ```

### **Option B: Using the MCP Manager**

1. Open the MCP manager:
   ```
   /mcp
   ```

2. Press `Z` to add Zen Gateway directly.

3. Enter your API key when prompted.

4. The configuration will be saved automatically.

---

## 3. Environment Variables Setup

For the most secure setup, use environment variables:

### **Mac/Linux:**
```bash
export OPENCODE_API_KEY=sk-...
export ZEN_ENDPOINT=https://zen-gateway.opencode.com/api/v1  # Optional
```

### **Windows (PowerShell):**
```powershell
$env:OPENCODE_API_KEY="sk-..."
$env:ZEN_ENDPOINT="https://zen-gateway.opencode.com/api/v1"  # Optional
```

### **Windows (CMD):**
```cmd
set OPENCODE_API_KEY=sk-...
set ZEN_ENDPOINT=https://zen-gateway.opencode.com/api/v1  # Optional
```

> **Tip:** Add these to your shell profile (`.bashrc`, `.zshrc`, or PowerShell profile) for persistence.

---

## 4. Manual Configuration (Advanced)

If you prefer to configure manually, edit your MCP config file:

**Location:** `~/.personal-cli/mcp.json` (Windows: `%USERPROFILE%\.personal-cli\mcp.json`)

```json
{
  "zen-gateway": {
    "transport": "stdio",
    "command": "npx",
    "args": ["-y", "@personal-cli/zen-mcp-server"],
    "env": {
      "OPENCODE_API_KEY": "sk-...",
      "ZEN_ENDPOINT": "https://zen-gateway.opencode.com/api/v1"
    },
    "enabled": true,
    "timeout": 60000,
    "trust": false
  }
}
```

> **Warning:** Never commit secrets (API keys) to source control!

---

## 5. Available CLI Commands

Once configured, you can use these commands:

### **Zen Gateway Commands:**
- `/zen status` - Check connection status and model availability
- `/zen models` - List all available AI models
- `/zen add` - Configure or reconfigure Zen Gateway
- `/zen remove` - Remove Zen Gateway configuration

### **MCP Commands:**
- `/mcp` - Open MCP manager (press `Z` for quick Zen Gateway setup)
- `/mcp list` - List all configured MCP servers

---

## 6. Verification

### **Check Status:**
```
/zen status
```

Expected output:
```
✅ Zen Gateway Connected
📍 Endpoint: https://zen-gateway.opencode.com/api/v1
📊 Models available: 15
```

### **List Models:**
```
/zen models
```

This will show all available AI models through the Zen Gateway.

### **Test Connection:**
The Zen Gateway will be automatically used when you send messages to the AI. You can verify it's working by checking if models from multiple providers are available in the model picker (`/model`).

---

## 7. Troubleshooting

### **Authentication Errors (401)**
- Double-check your API key
- Verify the key is properly set in environment variables or config
- Run `/zen add` to reconfigure

### **No Model/Server Response**
- Check your internet connection
- Verify Zen Gateway endpoint is accessible
- Run `/zen status` to see the error message

### **Rate Limiting (429)**
- Make sure your key is valid and not over quota
- Check with your administrator about rate limits

### **Connection Timeouts**
- Increase the timeout value in the config (default: 60000ms)
- Check network connectivity to the endpoint

### **MCP Server Not Starting**
- Ensure you have Node.js >= 22.0.0 installed
- Check that `@personal-cli/zen-mcp-server` package is installed
- Look for errors in the CLI output

---

## 8. Why Use the Zen Gateway?

- **Unified Access**: Single API for multiple AI models (OpenAI, Anthropic, open source, etc.)
- **Advanced Capabilities**: Tool-calling and CLI-targeted agent features
- **Centralized Management**: One API key for all providers
- **Future-Proof**: Provider/model updates happen server-side, no CLI reconfiguration needed
- **Cost Efficiency**: Optimized routing and caching

---

## 9. Architecture

```
┌─────────────────┐
│   personal-cli  │
│   (CLI Tool)    │
└────────┬────────┘
         │
         │ MCP Protocol
         │
┌────────▼────────┐
│  zen-mcp-server │
│  (MCP Server)   │
└────────┬────────┘
         │
         │ HTTP/REST
         │
┌────────▼────────┐
│  Zen Gateway    │
│  (API Gateway)  │
└────────┬────────┘
         │
         │ Multiple Providers
         │
┌────────▼────────┐
│ OpenAI/Claude/  │
│   etc.          │
└─────────────────┘
```

---

## 10. References

- [MCP Documentation](https://modelcontextprotocol.io/)
- [personal-cli README](./README.md)
- [zen-mcp-server Package](./packages/zen-mcp-server/README.md)

---

## 11. Support

For issues or questions:
- Check the troubleshooting section above
- Review error messages with `/zen status`
- Report issues at: https://github.com/anomalyco/opencode/issues

---

**Last Updated:** 2026-03-05
