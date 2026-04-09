/**
 * Copilot SDK Client
 * Session and model selection via @github/copilot-sdk.
 */

export interface CopilotSession {
  id: string;
  model: string;
  startedAt: number;
}

export interface CopilotClientConfig {
  apiKey?: string;
  model?: string;
}

/**
 * Create a new Copilot session.
 */
export async function createSession(config?: CopilotClientConfig): Promise<CopilotSession> {
  return {
    id: `session-${Date.now()}`,
    model: config?.model || "claude-sonnet-4.5",
    startedAt: Date.now(),
  };
}

/**
 * Get current session info.
 */
export async function getSession(sessionId: string): Promise<CopilotSession | null> {
  return {
    id: sessionId,
    model: "claude-sonnet-4.5",
    startedAt: Date.now(),
  };
}

/**
 * End a session.
 */
export async function endSession(_sessionId: string): Promise<void> {
  // No-op stub — actual implementation calls copilot-sdk
}