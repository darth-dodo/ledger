import { Component, inject, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ChatService,
  ChatSession,
  ChatMessage,
  Source,
} from '../../core/services/chat.service';

interface DisplayMessage {
  role: 'user' | 'assistant';
  content: string;
  sources: Source[] | null;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex h-[calc(100vh-8rem)] gap-4">
      <!-- Sidebar -->
      <aside class="w-64 shrink-0 flex flex-col border border-base-300 rounded-lg bg-base-100">
        <div class="p-3 border-b border-base-300">
          <button class="btn btn-primary btn-sm w-full" (click)="newChat()">+ New Chat</button>
        </div>
        <div class="flex-1 overflow-y-auto p-2 space-y-1">
          @if (sessionsLoading) {
            <div class="flex justify-center py-4">
              <span class="loading loading-spinner loading-sm"></span>
            </div>
          }
          @for (session of sessions; track session.id) {
            <div
              class="group flex items-center gap-1 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors hover:bg-base-200"
              [class.bg-base-200]="session.id === activeSessionId"
              [class.font-medium]="session.id === activeSessionId"
              (click)="selectSession(session)"
            >
              <span class="flex-1 truncate">{{ session.title ?? 'Untitled' }}</span>
              <button
                class="btn btn-ghost btn-xs opacity-0 group-hover:opacity-100 transition-opacity text-base-content/40 hover:text-error"
                (click)="deleteSession(session.id, $event)"
                aria-label="Delete session"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>
          }
          @if (!sessionsLoading && sessions.length === 0) {
            <p class="text-xs text-base-content/40 text-center py-4">No conversations yet</p>
          }
        </div>
      </aside>

      <!-- Main chat area -->
      <div class="flex-1 flex flex-col border border-base-300 rounded-lg bg-base-100 min-w-0">
        <!-- Messages -->
        <div class="flex-1 overflow-y-auto p-4 space-y-4" #messagesContainer>
          @if (messagesLoading) {
            <div class="flex justify-center py-8">
              <span class="loading loading-spinner loading-md"></span>
            </div>
          }

          @if (!messagesLoading && messages.length === 0) {
            <div class="flex flex-col items-center justify-center h-full text-base-content/40">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p class="text-sm">Ask questions about your financial data</p>
            </div>
          }

          @for (msg of messages; track $index) {
            <div class="chat" [class.chat-end]="msg.role === 'user'" [class.chat-start]="msg.role === 'assistant'">
              <div class="chat-header text-xs text-base-content/40 mb-1">
                {{ msg.role === 'user' ? 'You' : 'Ledger AI' }}
              </div>
              <div
                class="chat-bubble max-w-[80%]"
                [class.chat-bubble-primary]="msg.role === 'user'"
                [class.chat-bubble-neutral]="msg.role === 'assistant'"
              >
                <span class="whitespace-pre-wrap">{{ msg.content }}</span>
                @if (msg.role === 'assistant' && isStreaming && $index === messages.length - 1 && !msg.content) {
                  <span class="loading loading-dots loading-sm"></span>
                }
              </div>
            </div>

            <!-- Sources -->
            @if (msg.role === 'assistant' && msg.sources && msg.sources.length > 0) {
              <div class="ml-12 mt-1">
                <div class="collapse collapse-arrow bg-base-200/50 rounded-lg">
                  <input type="checkbox" />
                  <div class="collapse-title text-xs font-medium py-2 min-h-0">
                    {{ msg.sources.length }} source{{ msg.sources.length !== 1 ? 's' : '' }} referenced
                  </div>
                  <div class="collapse-content px-3 pb-3">
                    <div class="space-y-2">
                      @for (source of msg.sources; track source.id) {
                        <div class="card bg-base-100 border border-base-300">
                          <div class="card-body p-3">
                            <div class="flex items-center gap-2 mb-1">
                              <span class="badge badge-xs badge-info">Vector Search</span>
                              @if (source.distance != null) {
                                <span class="text-xs text-base-content/40">
                                  distance: {{ source.distance.toFixed(3) }}
                                </span>
                              }
                            </div>
                            <p class="text-xs text-base-content/70 line-clamp-3">{{ source.content }}</p>
                          </div>
                        </div>
                      }
                    </div>
                  </div>
                </div>
              </div>
            }
          }
        </div>

        <!-- Error -->
        @if (errorMessage) {
          <div role="alert" class="alert alert-error mx-4 mb-2">
            <span class="text-sm">{{ errorMessage }}</span>
            <button class="btn btn-ghost btn-xs" (click)="errorMessage = ''">Dismiss</button>
          </div>
        }

        <!-- Input -->
        <div class="border-t border-base-300 p-3">
          <form (submit)="send($event)" class="flex gap-2">
            <textarea
              class="textarea textarea-bordered flex-1 resize-none leading-snug"
              rows="1"
              placeholder="Ask about your transactions..."
              [(ngModel)]="inputText"
              name="message"
              (keydown.enter)="onEnterKey($event)"
              [disabled]="isStreaming"
            ></textarea>
            <button
              type="submit"
              class="btn btn-primary self-end"
              [disabled]="isStreaming || !inputText.trim()"
            >
              @if (isStreaming) {
                <span class="loading loading-spinner loading-sm"></span>
              } @else {
                Send
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .line-clamp-3 {
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      @media (max-width: 768px) {
        aside {
          display: none;
        }
      }
    `,
  ],
})
export class ChatComponent implements AfterViewChecked {
  private readonly chatService = inject(ChatService);

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef<HTMLDivElement>;

  sessions: ChatSession[] = [];
  messages: DisplayMessage[] = [];
  activeSessionId: string | null = null;
  inputText = '';

  sessionsLoading = false;
  messagesLoading = false;
  isStreaming = false;
  errorMessage = '';

  private shouldScrollToBottom = false;

  ngOnInit(): void {
    this.loadSessions();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  newChat(): void {
    this.activeSessionId = null;
    this.messages = [];
    this.errorMessage = '';
  }

  selectSession(session: ChatSession): void {
    if (this.activeSessionId === session.id) return;
    this.activeSessionId = session.id;
    this.loadMessages(session.id);
  }

  deleteSession(sessionId: string, event: Event): void {
    event.stopPropagation();
    this.chatService.deleteSession(sessionId).subscribe({
      next: () => {
        this.sessions = this.sessions.filter((s) => s.id !== sessionId);
        if (this.activeSessionId === sessionId) {
          this.newChat();
        }
      },
    });
  }

  send(event: Event): void {
    event.preventDefault();
    const text = this.inputText.trim();
    if (!text || this.isStreaming) return;

    this.inputText = '';
    this.errorMessage = '';

    // Add user message
    this.messages = [...this.messages, { role: 'user', content: text, sources: null }];
    this.shouldScrollToBottom = true;

    // Add empty assistant placeholder
    this.messages = [...this.messages, { role: 'assistant', content: '', sources: null }];

    this.isStreaming = true;
    const assistantIdx = this.messages.length - 1;

    this.chatService.sendMessage(this.activeSessionId, text).subscribe({
      next: (token) => {
        if (token.startsWith('__SESSION_ID__:')) {
          this.activeSessionId = token.slice('__SESSION_ID__:'.length);
          return;
        }
        const updated = [...this.messages];
        updated[assistantIdx] = {
          ...updated[assistantIdx],
          content: updated[assistantIdx].content + token,
        };
        this.messages = updated;
        this.shouldScrollToBottom = true;
      },
      error: (err) => {
        this.isStreaming = false;
        this.errorMessage = err.message ?? 'Failed to send message.';
      },
      complete: () => {
        this.isStreaming = false;
        this.loadSessions();
      },
    });
  }

  onEnterKey(event: Event): void {
    const keyEvent = event as KeyboardEvent;
    if (!keyEvent.shiftKey) {
      keyEvent.preventDefault();
      this.send(event);
    }
  }

  private loadSessions(): void {
    this.sessionsLoading = true;
    this.chatService.getSessions().subscribe({
      next: (data) => {
        this.sessions = data;
        this.sessionsLoading = false;
      },
      error: () => {
        this.sessionsLoading = false;
      },
    });
  }

  private loadMessages(sessionId: string): void {
    this.messagesLoading = true;
    this.errorMessage = '';
    this.chatService.getMessages(sessionId).subscribe({
      next: (data) => {
        this.messages = data.map((m) => ({
          role: m.role,
          content: m.content,
          sources: m.sources,
        }));
        this.messagesLoading = false;
        this.shouldScrollToBottom = true;
      },
      error: (err) => {
        this.messagesLoading = false;
        this.errorMessage = err.error?.message ?? 'Failed to load messages.';
      },
    });
  }

  private scrollToBottom(): void {
    const el = this.messagesContainer?.nativeElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }
}
