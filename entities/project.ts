import { Field, ID, ObjectType } from 'type-graphql'
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  OneToMany,
  ColumnOptions,
  JoinTable
} from 'typeorm'

import { Organisation } from './organisation'
import { OrganisationProject } from './organisationProject'
//NO idea why the below import doesn't work!!!
//import { RelationColumn } from "../helpers";
function RelationColumn (options?: ColumnOptions) {
  return Column({ nullable: true, ...options })
}

@Entity()
@ObjectType()
export class Project {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number

  @Field()
  @Column()
  title: string

  @Field({ nullable: true })
  @Column({ nullable: true })
  description?: string

  @Field()
  @Column({ nullable: true })
  creationDate: Date

  // @Field()
  // @Column({ nullable: true })
  // organisation_project_id?: number

  @Field(type => [Organisation])
  @ManyToMany(type => Organisation)
  @JoinTable()
  organisations: Organisation[]

  @Field(type => [OrganisationProject], { nullable: true })
  @OneToMany(
    type => OrganisationProject,
    organisationProject => organisationProject.organisation
  )
  organisationProjects?: OrganisationProject[]
  // @JoinTable({
  //   name: 'organisation_project',
  //   joinColumn: {
  //     name: 'id',
  //     referencedColumnName: 'organisation_project_id'
  //   }
  // })

  // @RelationColumn()
  // organisation_project_id?: number

  // @Field(type => User)
  // @ManyToOne(type => User)
  // author: User

  // @RelationColumn()
  // authorId: number
}