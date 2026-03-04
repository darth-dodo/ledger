import type { LoggerService } from '@nestjs/common';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'error' | 'warn' | 'debug' | 'verbose';
  context: string;
  message: string;
}

export class JsonLogger implements LoggerService {
  private emit(level: LogEntry['level'], message: unknown, ...optionalParams: unknown[]): void {
    const context = this.extractContext(optionalParams);
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context,
      message: typeof message === 'string' ? message : JSON.stringify(message),
    };
    console.log(JSON.stringify(entry));
  }

  log(message: unknown, ...optionalParams: unknown[]): void {
    this.emit('info', message, ...optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    this.emit('error', message, ...optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.emit('warn', message, ...optionalParams);
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.emit('debug', message, ...optionalParams);
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.emit('verbose', message, ...optionalParams);
  }

  private extractContext(optionalParams: unknown[]): string {
    if (optionalParams.length === 0) {
      return '';
    }
    const last = optionalParams[optionalParams.length - 1];
    return typeof last === 'string' ? last : '';
  }
}
