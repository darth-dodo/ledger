import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import type { ModelMessage } from 'ai';
import { ChatSession } from './entities/chat-session.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { MistralService } from '../mistral/mistral.service';
import { createVectorSearchTool } from './tools/vector-search.tool';
import { createSqlQueryTool } from './tools/sql-query.tool';

const SYSTEM_PROMPT = `You are a helpful financial assistant analyzing the user's bank statements and transactions.

You have access to two tools:
- vector_search: Search through bank statement text chunks using semantic similarity. Best for contextual questions like "what was that charge from last week?" or "tell me about my Amazon purchases."
- sql_query: Query the PostgreSQL transactions database directly with SQL. Best for calculations and aggregations like "how much did I spend on food?" or "what's my biggest expense this month?"

The transactions table schema (PostgreSQL):
  id            UUID PRIMARY KEY
  statement_id  UUID (foreign key to statements)
  date          DATE
  description   VARCHAR
  amount        NUMERIC(12,2)
  category      VARCHAR (e.g. groceries, dining, transport, utilities, entertainment, shopping, health, education, travel, income, transfer, other)
  type          VARCHAR ('debit' or 'credit')

IMPORTANT: Use PostgreSQL syntax, NOT SQLite.

Example SQL queries:
- Total spending this month:
  SELECT SUM(amount) FROM transactions WHERE type = 'debit' AND date >= date_trunc('month', CURRENT_DATE);
- Spending by category this month:
  SELECT category, SUM(amount) AS total FROM transactions WHERE type = 'debit' AND date >= date_trunc('month', CURRENT_DATE) GROUP BY category ORDER BY total DESC;
- Top 5 largest expenses:
  SELECT description, amount, date FROM transactions WHERE type = 'debit' ORDER BY amount DESC LIMIT 5;
- Daily spending for the last 7 days:
  SELECT date, SUM(amount) AS total FROM transactions WHERE type = 'debit' AND date >= CURRENT_DATE - INTERVAL '7 days' GROUP BY date ORDER BY date;
- Income vs expenses this month:
  SELECT type, SUM(amount) AS total FROM transactions WHERE date >= date_trunc('month', CURRENT_DATE) GROUP BY type;

Choose the appropriate tool based on the question. You may use multiple tools if needed.
Always cite specific transactions or data in your response.
If the data doesn't contain the answer, say so honestly.
Format currency amounts clearly.`;

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    @InjectRepository(ChatSession)
    private readonly sessionRepo: Repository<ChatSession>,
    @InjectRepository(ChatMessage)
    private readonly messageRepo: Repository<ChatMessage>,
    @Inject(EmbeddingsService)
    private readonly embeddingsService: EmbeddingsService,
    @Inject(MistralService)
    private readonly mistralService: MistralService,
    @Inject(DataSource)
    private readonly dataSource: DataSource,
  ) {}

  async chat(sessionId: string | null, message: string): Promise<{ streamResult: ReturnType<typeof import('ai').streamText>; sessionId: string }> {
    // 1. Create or get session
    let session: ChatSession;
    let isNewSession = false;

    if (sessionId) {
      const existing = await this.sessionRepo.findOne({ where: { id: sessionId } });
      if (!existing) {
        throw new Error(`Session ${sessionId} not found`);
      }
      session = existing;
    } else {
      session = this.sessionRepo.create({ title: null });
      session = await this.sessionRepo.save(session);
      isNewSession = true;
    }

    // 2. Save user message
    const userMessage = this.messageRepo.create({
      sessionId: session.id,
      role: 'user',
      content: message,
      sources: null,
    });
    await this.messageRepo.save(userMessage);

    // 3. Load conversation history (last 10 messages)
    const history = await this.messageRepo.find({
      where: { sessionId: session.id },
      order: { createdAt: 'ASC' },
      take: 10,
    });

    const messages: ModelMessage[] = history.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    // 4. Build tools with injected dependencies
    const tools = {
      vector_search: createVectorSearchTool(this.embeddingsService),
      sql_query: createSqlQueryTool(this.dataSource),
    };

    // 5. Call mistralService.chatStream()
    const streamResult = this.mistralService.chatStream({
      system: SYSTEM_PROMPT,
      messages,
      tools,
      maxSteps: 3,
    });

    // 6. Save assistant response after stream completes (background)
    const sessionForSave = session;
    const newSession = isNewSession;
    const userMsg = message;

    void (async () => {
      try {
        const text = await streamResult.text;

        const assistantMessage = this.messageRepo.create({
          sessionId: sessionForSave.id,
          role: 'assistant',
          content: text,
          sources: null,
        });
        await this.messageRepo.save(assistantMessage);

        // Auto-generate title for new sessions
        if (newSession) {
          sessionForSave.title = userMsg.substring(0, 50);
          await this.sessionRepo.save(sessionForSave);
        }
      } catch (err) {
        this.logger.error(
          `Failed to save assistant message: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    })();

    return { streamResult, sessionId: session.id };
  }

  async getSessions(): Promise<ChatSession[]> {
    return this.sessionRepo.find({
      order: { updatedAt: 'DESC' },
    });
  }

  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    return this.messageRepo.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.sessionRepo.delete(sessionId);
  }
}
