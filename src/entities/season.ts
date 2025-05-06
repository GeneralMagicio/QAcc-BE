import { Field, ID, Int, ObjectType } from 'type-graphql';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
  OneToMany,
} from 'typeorm';
import { Project } from './project';
import { ProjectUserRecord } from './projectUserRecord';

@Entity()
@ObjectType()
export class Season extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field(_type => Int)
  @Column()
  seasonNumber: number;

  @Field()
  @Column()
  startDate: Date;

  @Field()
  @Column()
  endDate: Date;

  @Field(_type => [Project], { nullable: true })
  @OneToMany(_type => Project, project => project.season)
  projects: Project[];

  @Field(_type => [ProjectUserRecord], { nullable: true })
  @OneToMany(_type => ProjectUserRecord, record => record.season)
  projectUserRecords: ProjectUserRecord[];

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
