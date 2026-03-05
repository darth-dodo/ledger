import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Statement } from '../../upload/entities/statement.entity.js';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'statement_id', type: 'uuid' })
  statementId!: string;

  @ManyToOne(() => Statement, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'statement_id' })
  statement!: Statement;

  @Index()
  @Column({ type: 'date' })
  date!: Date;

  @Column({ type: 'varchar', length: 500 })
  description!: string;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: {
      to: (value: number): number => value,
      from: (value: string | null): number | null =>
        value === null ? null : parseFloat(value),
    },
  })
  amount!: number;

  @Column({ type: 'varchar', length: 10 })
  type!: string;

  @Index()
  @Column({ type: 'varchar', length: 100, nullable: true })
  category!: string | null;
}
