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

    // Set SSE headers and send session ID as first event before piping the AI stream
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write(`data: ${JSON.stringify({ type: 'session-id', sessionId })}\n\n`);

    // Pipe the AI stream (appends its own SSE events)
    streamResult.pipeUIMessageStreamToResponse(res);
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
