/**
 * Logger
 * Structured logging with levels and timestamps.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getEnvLevel(): LogLevel {
  const env = process.env["OMP_LOG_LEVEL"]?.toLowerCase() as LogLevel;
  if (env && LEVEL_PRIORITY[env] !== undefined) return env;
  return "info";
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[getEnvLevel()];
}

function timestamp(): string {
  return new Date().toISOString();
}

function formatMessage(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
  return `[${timestamp()}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

/**
 * Log a debug message.
 */
export function debug(message: string, meta?: Record<string, unknown>): void {
  if (shouldLog("debug")) {
    process.stderr.write(`${formatMessage("debug", message, meta)}\n`);
  }
}

/**
 * Log an info message.
 */
export function info(message: string, meta?: Record<string, unknown>): void {
  if (shouldLog("info")) {
    process.stderr.write(`${formatMessage("info", message, meta)}\n`);
  }
}

/**
 * Log a warning message.
 */
export function warn(message: string, meta?: Record<string, unknown>): void {
  if (shouldLog("warn")) {
    process.stderr.write(`${formatMessage("warn", message, meta)}\n`);
  }
}

/**
 * Log an error message.
 */
export function error(message: string, meta?: Record<string, unknown>): void {
  if (shouldLog("error")) {
    process.stderr.write(`${formatMessage("error", message, meta)}\n`);
  }
}

/**
 * Create a child logger with additional context.
 */
export function child(context: Record<string, unknown>): {
  debug: (msg: string, meta?: Record<string, unknown>) => void;
  info: (msg: string, meta?: Record<string, unknown>) => void;
  warn: (msg: string, meta?: Record<string, unknown>) => void;
  error: (msg: string, meta?: Record<string, unknown>) => void;
} {
  return {
    debug: (msg, meta) => debug(msg, { ...context, ...meta }),
    info: (msg, meta) => info(msg, { ...context, ...meta }),
    warn: (msg, meta) => warn(msg, { ...context, ...meta }),
    error: (msg, meta) => error(msg, { ...context, ...meta }),
  };
}