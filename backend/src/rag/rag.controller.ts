import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Inject,
  Res,
  ParseUUIDPipe,
} from '@nestjs/common';
import type { ServerResponse } from 'http';
import { RagService } from './rag.service';

@Controller('chat')
export class RagController {
  constructor(
    @Inject(RagService)
    private readonly ragService: RagService,
  ) {}

  @Post()
  async chat(
    @Body() body: { sessionId?: string; message: string; currency?: string },
    @Res() res: ServerResponse,
  ): Promise<void> {
    const { streamResult, sessionId } = await this.ragService.chat(
      body.sessionId ?? null,
      body.message,
      body.currency ?? 'USD',
    );

    // Set SSE headers and send session ID as first event
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write(`data: ${JSON.stringify({ type: 'session-id', sessionId })}\n\n`);

    // Iterate over the full stream to capture both text deltas and tool results.
    // We cannot use pipeUIMessageStreamToResponse() because it calls writeHead
    // internally, which conflicts with our custom session-id header above.
    // The ReAct agent often puts its final answer in the `done` tool's summary
    // (Zod-validated) rather than as plain text, so we extract both.
    for await (const event of streamResult.fullStream) {
      if (event.type === 'text-delta') {
        res.write(`data: ${JSON.stringify({ type: 'text-delta', delta: event.text })}\n\n`);
      } else if (
        event.type === 'tool-result' &&
        event.toolName === 'done' &&
        typeof event.output?.summary === 'string'
      ) {
        // The done tool's Zod-validated summary is the agent's final answer
        res.write(
          `data: ${JSON.stringify({ type: 'text-delta', delta: event.output.summary })}\n\n`,
        );
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();
  }

  @Get('sessions')
  async getSessions() {
    return this.ragService.getSessions();
  }

  @Get('sessions/:id/messages')
  async getMessages(@Param('id', ParseUUIDPipe) id: string) {
    return this.ragService.getMessages(id);
  }

  @Delete('sessions/:id')
  async deleteSession(@Param('id', ParseUUIDPipe) id: string) {
    await this.ragService.deleteSession(id);
    return { deleted: true };
  }
}
