import { readFileSync, statSync, existsSync } from 'fs';
import { basename } from 'path';
import type { Attachment } from './types/index.js';

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico'];

export function detectFileType(filePath: string): 'image' | 'file' {
  const ext = filePath.toLowerCase().slice(filePath.lastIndexOf('.'));
  return IMAGE_EXTENSIONS.includes(ext) ? 'image' : 'file';
}

export function getMimeType(filePath: string): string {
  const ext = filePath.toLowerCase().slice(filePath.lastIndexOf('.'));
  const mimeTypes: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.json': 'application/json',
    '.js': 'application/javascript',
    '.ts': 'application/typescript',
    '.html': 'text/html',
    '.css': 'text/css',
    '.xml': 'application/xml',
    '.yaml': 'application/yaml',
    '.yml': 'application/yaml',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

export function loadAttachment(filePath: string, type?: 'file' | 'image'): Attachment | null {
  if (!existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return null;
  }

  try {
    const stats = statSync(filePath);
    const detectedType = type || detectFileType(filePath);
    const mimeType = getMimeType(filePath);
    
    // For images, read as base64
    // For text files, read as utf-8
    // For binary files, read as base64
    let content: string;
    
    if (detectedType === 'image') {
      const buffer = readFileSync(filePath);
      content = buffer.toString('base64');
    } else if (isTextFile(mimeType)) {
      content = readFileSync(filePath, 'utf-8');
    } else {
      const buffer = readFileSync(filePath);
      content = buffer.toString('base64');
    }

    return {
      id: generateId(),
      path: filePath,
      name: basename(filePath),
      type: detectedType,
      size: stats.size,
      content,
      mimeType,
    };
  } catch (err) {
    console.error(`Failed to load attachment ${filePath}:`, err);
    return null;
  }
}

function isTextFile(mimeType: string): boolean {
  return mimeType.startsWith('text/') || 
    ['application/json', 'application/javascript', 'application/typescript', 'application/xml', 'application/yaml'].includes(mimeType);
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function formatAttachmentForDisplay(attachment: Attachment): string {
  const sizeStr = attachment.size ? formatFileSize(attachment.size) : '';
  const icon = attachment.type === 'image' ? '🖼️' : '📄';
  return `${icon} ${attachment.name}${sizeStr ? ` (${sizeStr})` : ''}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function attachmentToMarkdown(attachment: Attachment): string {
  if (attachment.type === 'image') {
    return `![${attachment.name}](data:${attachment.mimeType};base64,${attachment.content?.slice(0, 100)}...)`;
  } else {
    // For text files, show first 500 chars
    const preview = attachment.content?.slice(0, 500) || '';
    const truncated = (attachment.content?.length || 0) > 500 ? '...' : '';
    return `\`\`\`\n${preview}${truncated}\n\`\`\``;
  }
}

export function createAttachmentPrompt(attachments: Attachment[]): string {
  if (attachments.length === 0) return '';
  
  let prompt = '\n\n---\n\n**Attachments:**\n\n';
  
  for (const att of attachments) {
    if (att.type === 'image') {
      prompt += `**Image: ${att.name}**\n`;
      prompt += `[Image content attached - ${att.mimeType}]\n\n`;
    } else {
      prompt += `**File: ${att.name}**\n`;
      const preview = att.content?.slice(0, 2000) || '';
      const truncated = (att.content?.length || 0) > 2000 ? '\n\n[Content truncated...]' : '';
      prompt += `\`\`\`\n${preview}${truncated}\n\`\`\`\n\n`;
    }
  }
  
  return prompt;
}
