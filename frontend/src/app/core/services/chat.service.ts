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

  sendMessage(sessionId: string | null, message: string, currency: string): Observable<string> {
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
                    subscriber.next(`__SESSION_ID__:${chunk.sessionId}`);
                  } else if (chunk.type === 'text-delta' && typeof chunk.delta === 'string') {
                    subscriber.next(chunk.delta);
                  }
                } catch {
                  subscriber.next(raw);
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
