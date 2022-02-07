import { Field, ID, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  BaseEntity,
  OneToMany,
  Index,
  ManyToOne,
  RelationId,
} from 'typeorm';
import { Project } from './project';
import { ProjectStatus } from './projectStatus';
import { ProjectStatusReason } from './projectStatusReason';

@Entity()
@ObjectType()
export class ProjectStatusHistory extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field(type => Project)
  @ManyToOne(type => Project)
  project: Project;

  @RelationId(
    (projectStatusHistory: ProjectStatusHistory) =>
      projectStatusHistory.project,
  )
  projectId: number;

  @Field(type => ProjectStatus)
  @ManyToOne(type => ProjectStatus)
  status: ProjectStatus;

  @RelationId(
    (projectStatusHistory: ProjectStatusHistory) => projectStatusHistory.status,
  )
  statusId: number;

  @Field(type => ProjectStatus)
  @ManyToOne(type => ProjectStatus)
  prevStatus: ProjectStatus;

  @RelationId(
    (projectStatusHistory: ProjectStatusHistory) =>
      projectStatusHistory.prevStatus,
  )
  prevStatusId: number;

  @Field(type => ProjectStatusReason)
  @ManyToOne(type => ProjectStatusReason)
  reason?: ProjectStatusReason;

  @RelationId(
    (projectStatusHistory: ProjectStatusHistory) => projectStatusHistory.reason,
  )
  reasonId: number;
}
