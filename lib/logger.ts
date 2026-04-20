type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  msg: string;
  requestId?: string;
  [key: string]: unknown;
}

const isProd = process.env.NODE_ENV === 'production';

function emit(entry: LogEntry) {
  const { level, ...rest } = entry;
  if (isProd) {
    console[level === 'debug' ? 'log' : level](JSON.stringify({ ...rest, level, ts: new Date().toISOString() }));
  } else {
    const prefix = `[${level.toUpperCase()}]${rest.requestId ? ` [${rest.requestId}]` : ''}`;
    console[level === 'debug' ? 'log' : level](prefix, rest.msg, Object.keys(rest).length > 2 ? rest : '');
  }
}

export function createLogger(requestId?: string) {
  return {
    debug: (msg: string, meta?: Record<string, unknown>) => emit({ level: 'debug', msg, requestId, ...meta }),
    info:  (msg: string, meta?: Record<string, unknown>) => emit({ level: 'info',  msg, requestId, ...meta }),
    warn:  (msg: string, meta?: Record<string, unknown>) => emit({ level: 'warn',  msg, requestId, ...meta }),
    error: (msg: string, meta?: Record<string, unknown>) => emit({ level: 'error', msg, requestId, ...meta }),
  };
}

export type Logger = ReturnType<typeof createLogger>;
