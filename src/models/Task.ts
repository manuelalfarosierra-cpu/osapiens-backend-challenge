import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class Task {
  @PrimaryGeneratedColumn("uuid")
  taskId: string;

  @Column()
  clientId: string;

  @Column("text")
  geoJson: string;

  @Column()
  status: string;

  @Column({ nullable: true })
  progress: string;

  @Column({ nullable: true })
  resultId: string;
}
