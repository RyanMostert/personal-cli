import React, { useState, useCallback } from 'react';
import { MCPClientManager, type MCPServerConfig } from '@personal-cli/mcp-client';
import {
  ZenGatewayConfigSchema,
  ZenGatewayStatusSchema,
  ZenModelSchema,
  type ZenGatewayConfig,
  type ZenGatewayStatus,
  type ZenModel,
} from '@personal-cli/zen-mcp-server';
import { loadMCPConfig } from '@personal-cli/core';
import { parseZenGatewayConfig, parseZenGatewayConfigFromEnv } from '../utils/zen-config.js';
import { getToolTextResult } from '../utils/tool-result.js';

export interface UseZenGatewayResult {
  zenConfig: ZenGatewayConfig | null;
  setZenConfig: React.Dispatch<React.SetStateAction<ZenGatewayConfig | null>>;
  resolveZenGatewayConfig: () => ZenGatewayConfig | null;
  callZenGatewayTool: <T>(
    toolName: 'zen_get_status' | 'zen_list_models',
    parse: (text: string) => T,
  ) => Promise<T | null>;
  parseZenGatewayStatusResult: (text: string) => ZenGatewayStatus;
  parseZenGatewayModelsResult: (text: string) => ZenModel[];
  syncZenConfigFromMcp: (config: MCPServerConfig) => void;
  saveZenConfigFromMcp: (config: MCPServerConfig) => void;
}

export function useZenGateway(mcpManager: MCPClientManager): UseZenGatewayResult {
  const [zenConfig, setZenConfig] = useState<ZenGatewayConfig | null>(() => {
    const mcpConfigs = loadMCPConfig();
    return parseZenGatewayConfig(mcpConfigs['zen-gateway']) ?? parseZenGatewayConfigFromEnv();
  });

  const resolveZenGatewayConfig = useCallback((): ZenGatewayConfig | null => {
    if (zenConfig) {
      return zenConfig;
    }

    const config =
      parseZenGatewayConfig(loadMCPConfig()['zen-gateway']) ?? parseZenGatewayConfigFromEnv();
    if (config) {
      setZenConfig(config);
    }

    return config;
  }, [zenConfig]);

  const callZenGatewayTool = useCallback(
    async <T>(
      toolName: 'zen_get_status' | 'zen_list_models',
      parse: (text: string) => T,
    ): Promise<T | null> => {
      if (!resolveZenGatewayConfig()) {
        return null;
      }

      if (!mcpManager.isConnected('zen-gateway')) {
        throw new Error('Zen Gateway is configured but the MCP server is not connected.');
      }

      const result = await mcpManager.callTool(`zen-gateway__${toolName}`, {});
      const text = getToolTextResult(result);
      if (result.isError) {
        throw new Error(text.replace(/^Error:\s*/, ''));
      }

      return parse(text);
    },
    [mcpManager, resolveZenGatewayConfig],
  );

  const parseZenGatewayStatusResult = useCallback((text: string): ZenGatewayStatus => {
    const parsed = ZenGatewayStatusSchema.safeParse(JSON.parse(text));
    if (!parsed.success) {
      throw new Error('Zen Gateway returned an invalid status response.');
    }

    return parsed.data;
  }, []);

  const parseZenGatewayModelsResult = useCallback((text: string): ZenModel[] => {
    const parsed = ZenModelSchema.array().safeParse(JSON.parse(text));
    if (!parsed.success) {
      throw new Error('Zen Gateway returned an invalid models response.');
    }

    return parsed.data;
  }, []);

  const syncZenConfigFromMcp = useCallback((config: MCPServerConfig): void => {
    const parsedConfig = parseZenGatewayConfig(config);
    if (parsedConfig) {
      setZenConfig(parsedConfig);
    } else {
      setZenConfig(null);
    }
  }, []);

  const saveZenConfigFromMcp = useCallback((config: MCPServerConfig): void => {
    const parsedConfig = parseZenGatewayConfig(config);
    if (parsedConfig) {
      setZenConfig(parsedConfig);
      return;
    }

    const envConfig = parseZenGatewayConfigFromEnv();
    if (envConfig) {
      setZenConfig(envConfig);
      return;
    }

    setZenConfig(null);
  }, []);

  return {
    zenConfig,
    setZenConfig,
    resolveZenGatewayConfig,
    callZenGatewayTool,
    parseZenGatewayStatusResult,
    parseZenGatewayModelsResult,
    syncZenConfigFromMcp,
    saveZenConfigFromMcp,
  };
}
