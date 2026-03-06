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

  sendMessage(sessionId: string | null, message: string): Observable<string> {
    return new Observable((subscriber) => {
      const abortController = new AbortController();

      fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message }),
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
                // AI SDK v6 UI message stream: SSE with JSON chunks
                const raw = line.slice(6).trim();
                if (!raw || raw === '[DONE]') continue;
                try {
                  const chunk = JSON.parse(raw);
                  if (chunk.type === 'text-delta' && typeof chunk.delta === 'string') {
                    subscriber.next(chunk.delta);
                  }
                  // other chunk types (text-start, text-end, tool-*) are ignored for now
                } catch {
                  // Non-JSON SSE data — emit as-is
                  subscriber.next(raw);
                }
              } else if (line.startsWith('0:')) {
                // Legacy Vercel AI SDK data stream format: 0:"token"
                const token = JSON.parse(line.slice(2));
                subscriber.next(token);
              } else if (line.startsWith('d:')) {
                // Legacy Vercel AI SDK finish message
                try {
                  const data = JSON.parse(line.slice(2));
                  if (data.sessionId) {
                    subscriber.next(`__SESSION_ID__:${data.sessionId}`);
                  }
                } catch {
                  // ignore parse errors on finish message
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
