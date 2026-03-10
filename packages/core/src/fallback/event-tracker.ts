export type AgentEventType =
  | 'tool_call_start'
  | 'tool_call_success'
  | 'tool_call_failure'
  | 'tool_fallback_attempt'
  | 'tool_fallback_success'
  | 'tool_fallback_failure'
  | 'model_switch'
  | 'provider_switch'
  | 'mode_switch'
  | 'conversation_start'
  | 'conversation_end'
  | 'compaction'
  | 'undo'
  | 'redo';

export interface AgentEvent {
  id: string;
  type: AgentEventType;
  timestamp: number;
  data: Record<string, unknown>;
  duration?: number;
  success?: boolean;
  error?: string;
}

export interface EventReplay {
  events: AgentEvent[];
  startTime: number;
  endTime: number;
}

export class AgentEventTracker {
  private events: AgentEvent[] = [];
  private currentConversationId?: string;
  private maxEvents: number;

  constructor(maxEvents: number = 1000) {
    this.maxEvents = maxEvents;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  track(event: Omit<AgentEvent, 'id' | 'timestamp'>): AgentEvent {
    const fullEvent: AgentEvent = {
      ...event,
      id: this.generateId(),
      timestamp: Date.now(),
    };

    this.events.push(fullEvent);

    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    return fullEvent;
  }

  trackToolCall(toolName: string, args: Record<string, unknown>): AgentEvent {
    return this.track({
      type: 'tool_call_start',
      data: { toolName, args },
    });
  }

  trackToolSuccess(toolName: string, result: unknown, duration: number): AgentEvent {
    return this.track({
      type: 'tool_call_success',
      data: { toolName, result },
      duration,
      success: true,
    });
  }

  trackToolFailure(toolName: string, error: Error, duration: number): AgentEvent {
    return this.track({
      type: 'tool_call_failure',
      data: { toolName },
      duration,
      success: false,
      error: error.message,
    });
  }

  trackFallbackAttempt(toolName: string, strategy: string): AgentEvent {
    return this.track({
      type: 'tool_fallback_attempt',
      data: { toolName, strategy },
    });
  }

  trackFallbackSuccess(
    toolName: string,
    strategy: string,
    output: string,
    duration: number,
  ): AgentEvent {
    return this.track({
      type: 'tool_fallback_success',
      data: { toolName, strategy, output },
      duration,
      success: true,
    });
  }

  trackFallbackFailure(
    toolName: string,
    strategy: string,
    error: string,
    duration: number,
  ): AgentEvent {
    return this.track({
      type: 'tool_fallback_failure',
      data: { toolName, strategy },
      duration,
      success: false,
      error,
    });
  }

  trackModelSwitch(from: string, to: string): AgentEvent {
    return this.track({
      type: 'model_switch',
      data: { from, to },
    });
  }

  trackProviderSwitch(from: string, to: string): AgentEvent {
    return this.track({
      type: 'provider_switch',
      data: { from, to },
    });
  }

  trackModeSwitch(from: string, to: string): AgentEvent {
    return this.track({
      type: 'mode_switch',
      data: { from, to },
    });
  }

  trackConversationStart(conversationId?: string): AgentEvent {
    this.currentConversationId = conversationId;
    return this.track({
      type: 'conversation_start',
      data: { conversationId },
    });
  }

  trackConversationEnd(): AgentEvent {
    return this.track({
      type: 'conversation_end',
      data: { conversationId: this.currentConversationId },
    });
  }

  getEvents(filter?: { type?: AgentEventType; limit?: number }): AgentEvent[] {
    let result = [...this.events];

    if (filter?.type) {
      result = result.filter((e) => e.type === filter.type);
    }

    if (filter?.limit) {
      result = result.slice(-filter.limit);
    }

    return result;
  }

  getEventsForReplay(): EventReplay {
    return {
      events: [...this.events],
      startTime: this.events[0]?.timestamp ?? Date.now(),
      endTime: this.events[this.events.length - 1]?.timestamp ?? Date.now(),
    };
  }

  getRecentToolCalls(limit: number = 10): AgentEvent[] {
    return this.events.filter((e) => e.type === 'tool_call_start').slice(-limit);
  }

  getToolSuccessRate(): { total: number; success: number; rate: number } {
    const toolCalls = this.events.filter(
      (e) => e.type === 'tool_call_success' || e.type === 'tool_call_failure',
    );

    const success = toolCalls.filter((e) => e.success).length;
    const total = toolCalls.length;

    return {
      total,
      success,
      rate: total > 0 ? (success / total) * 100 : 100,
    };
  }

  clear() {
    this.events = [];
  }

  exportToJSON(): string {
    return JSON.stringify(
      {
        events: this.events,
        exportedAt: Date.now(),
      },
      null,
      2,
    );
  }
}

export function createEventTracker(maxEvents?: number): AgentEventTracker {
  return new AgentEventTracker(maxEvents);
}
