import { spawn, type ChildProcess } from 'child_process';
import { MCPTransport } from '../types.js';

export class StdioTransport implements MCPTransport {
  private process: ChildProcess | null = null;
  private messageHandler: ((message: unknown) => void) | null = null;
  private errorHandler: ((error: Error) => void) | null = null;
  private closeHandler: (() => void) | null = null;
  private buffer = '';

  constructor(
    private command: string,
    private args: string[] = [],
    private env: Record<string, string> = {},
    private cwd?: string
  ) {}

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.process = spawn(this.command, this.args, {
          env: { ...process.env, ...this.env },
          cwd: this.cwd,
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        if (!this.process.stdin || !this.process.stdout || !this.process.stderr) {
          reject(new Error('Failed to create stdio pipes'));
          return;
        }

        this.process.stdout.on('data', (data: Buffer) => {
          this.handleData(data.toString());
        });

        this.process.stderr.on('data', (data: Buffer) => {
          console.error(`MCP Server stderr: ${data.toString()}`);
        });

        this.process.on('error', (error) => {
          if (this.errorHandler) {
            this.errorHandler(error);
          }
          reject(error);
        });

        this.process.on('close', (code) => {
          if (this.closeHandler) {
            this.closeHandler();
          }
          if (code !== 0 && code !== null) {
            console.error(`MCP Server exited with code ${code}`);
          }
        });

        // Give the process a moment to start
        setTimeout(resolve, 100);
      } catch (error) {
        reject(error);
      }
    });
  }

  async disconnect(): Promise<void> {
    if (this.process) {
      this.process.kill('SIGTERM');
      
      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill('SIGKILL');
        }
      }, 5000);
      
      this.process = null;
    }
  }

  async send(message: unknown): Promise<void> {
    if (!this.process?.stdin) {
      throw new Error('Transport not connected');
    }
    
    const messageStr = JSON.stringify(message);
    this.process.stdin.write(messageStr + '\n');
  }

  onMessage(handler: (message: unknown) => void): void {
    this.messageHandler = handler;
  }

  onError(handler: (error: Error) => void): void {
    this.errorHandler = handler;
  }

  onClose(handler: () => void): void {
    this.closeHandler = handler;
  }

  private handleData(data: string): void {
    this.buffer += data;
    
    // Process line-by-line (JSON-RPC messages are newline-delimited)
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || ''; // Keep incomplete line in buffer
    
    for (const line of lines) {
      if (line.trim()) {
        try {
          const message = JSON.parse(line);
          if (this.messageHandler) {
            this.messageHandler(message);
          }
        } catch (error) {
          console.error('Failed to parse MCP message:', line);
          if (this.errorHandler) {
            this.errorHandler(new Error(`Invalid JSON: ${line}`));
          }
        }
      }
    }
  }
}
