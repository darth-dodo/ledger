import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ChatSession } from './chat-session.entity';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'session_id', type: 'uuid' })
  sessionId!: string;

  @ManyToOne(() => ChatSession, (s) => s.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session!: ChatSession;

  @Column({ type: 'varchar', length: 20 })
  role!: string; // 'user' | 'assistant'

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'jsonb', nullable: true })
  sources!: Record<string, unknown>[] | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
