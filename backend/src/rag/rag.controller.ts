import { Controller, Post, Get, Delete, Param, Body, Inject, Res, ParseUUIDPipe } from '@nestjs/common';
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

    // Set session ID header before piping (pipeUIMessageStreamToResponse sets its own SSE headers)
    res.setHeader('X-Session-Id', sessionId);

    // Pipe as UI message stream (sends SSE with JSON chunks the frontend can parse)
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
