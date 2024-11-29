import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class Result {
  @PrimaryGeneratedColumn("uuid")
  resultId: string;

  @Column()
  taskId: string;

  @Column("text")
  data: string; // Could be JSON or any serialized format
}
