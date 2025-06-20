import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum AttachmentEntityType {
  PROJECT = 'PROJECT',
  TASK = 'TASK',
}

@Entity('attachments')
export class Attachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  filename: string;

  @Column({ type: 'varchar' })
  fileType: string;

  @Column({ type: 'int' })
  fileSize: number;

  @Column({ type: 'varchar' })
  cloudinaryUrl: string;

  @Column({ type: 'varchar' })
  cloudinaryPublicId: string;

  @Column({
    type: 'enum',
    enum: AttachmentEntityType,
  })
  entityType: AttachmentEntityType;

  @Column({ type: 'varchar' })
  entityId: string;

  @Column({ type: 'uuid' })
  uploadedById: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy: User;

  @CreateDateColumn()
  uploadedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
