import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChatSession {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Source {
  id: string;
  content: string;
  statementId: string;
  distance?: number;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  sources: Source[] | null;
  createdAt: string;
}

export interface ThinkingStep {
  type: 'tool-call' | 'tool-result';
  toolName: string;
  content: Record<string, unknown>;
  timestamp: number;
}

export type ChatEvent =
  | { kind: 'session-id'; sessionId: string }
  | { kind: 'text-delta'; delta: string }
  | { kind: 'thinking-step'; step: ThinkingStep };

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly baseUrl = 'http://localhost:3000';

  constructor(private readonly http: HttpClient) {}

  getSessions(): Observable<ChatSession[]> {
    return this.http.get<ChatSession[]>(`${this.baseUrl}/chat/sessions`);
  }

  getMessages(sessionId: string): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.baseUrl}/chat/sessions/${sessionId}/messages`);
  }

  deleteSession(sessionId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/chat/sessions/${sessionId}`);
  }

  sendMessage(sessionId: string | null, message: string, currency: string): Observable<ChatEvent> {
    return new Observable((subscriber) => {
      const abortController = new AbortController();

      fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message, currency }),
        signal: abortController.signal,
      })
        .then(async (response) => {
          if (!response.ok) {
            const errBody = await response.json().catch(() => null);
            throw new Error(errBody?.message ?? `Request failed with status ${response.status}`);
          }

          const reader = response.body!.getReader();
          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const text = decoder.decode(value, { stream: true });
            const lines = text.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const raw = line.slice(6).trim();
                if (!raw || raw === '[DONE]') continue;
                try {
                  const chunk = JSON.parse(raw);
                  if (chunk.type === 'session-id' && typeof chunk.sessionId === 'string') {
                    subscriber.next({ kind: 'session-id', sessionId: chunk.sessionId });
                  } else if (chunk.type === 'text-delta' && typeof chunk.delta === 'string') {
                    subscriber.next({ kind: 'text-delta', delta: chunk.delta });
                  } else if (chunk.type === 'tool-call') {
                    subscriber.next({
                      kind: 'thinking-step',
                      step: {
                        type: 'tool-call',
                        toolName: chunk.toolName,
                        content: chunk.args,
                        timestamp: Date.now(),
                      },
                    });
                  } else if (chunk.type === 'tool-result') {
                    subscriber.next({
                      kind: 'thinking-step',
                      step: {
                        type: 'tool-result',
                        toolName: chunk.toolName,
                        content: chunk.result,
                        timestamp: Date.now(),
                      },
                    });
                  }
                } catch {
                  // Non-JSON data, skip
                }
              }
            }
          }

          subscriber.complete();
        })
        .catch((err) => {
          if (err.name !== 'AbortError') {
            subscriber.error(err);
          }
        });

      return () => abortController.abort();
    });
  }
}
