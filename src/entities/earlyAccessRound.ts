import {
  BaseEntity,
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  AfterLoad,
  ManyToMany,
} from 'typeorm';
import { Field, ID, ObjectType, Int, Float } from 'type-graphql';
import { Project } from './project';

@Entity()
@ObjectType()
export class EarlyAccessRound extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field(() => Int)
  @Column()
  @Index({ unique: true })
  roundNumber: number;

  @Field(() => Int, { nullable: true })
  @Column({ nullable: true })
  seasonNumber?: number;

  @Field(() => Date)
  @Column()
  startDate: Date;

  @Field(() => Date)
  @Column()
  endDate: Date;

  @Field(() => Date)
  @CreateDateColumn()
  createdAt: Date;

  @Field(() => Date)
  @UpdateDateColumn()
  updatedAt: Date;

  @Field(_type => Boolean)
  @Column({ default: false })
  isBatchMintingExecuted: boolean;

  @Field(() => Int, { nullable: true })
  @Column({ nullable: true })
  roundPOLCapPerProject?: number;

  @Field(() => Int, { nullable: true })
  @Column({ nullable: true })
  roundPOLCapPerUserPerProject?: number;

  @Field(_type => [Project], { nullable: true })
  @ManyToMany(_type => Project, project => project.earlyAccessRounds)
  projects: Project[];

  // virtual fields
  @Field(() => Float, { nullable: true })
  cumulativePOLCapPerProject?: number;

  @Field(() => Float, { nullable: true })
  cumulativePOLCapPerUserPerProject?: number;

  @AfterLoad()
  async calculateCumulativeCaps(): Promise<void> {
    const { cumulativePOLCapPerProject, cumulativePOLCapPerUserPerProject } =
      await EarlyAccessRound.createQueryBuilder('eaRound')
        .select(
          'sum(eaRound.roundPOLCapPerProject)',
          'cumulativePOLCapPerProject',
        )
        .addSelect(
          'sum(eaRound.roundPOLCapPerUserPerProject)',
          'cumulativePOLCapPerUserPerProject',
        )
        .where('eaRound.roundNumber <= :roundNumber', {
          roundNumber: this.roundNumber,
        })
        .andWhere('eaRound.seasonNumber = :seasonNumber', {
          seasonNumber: this.seasonNumber,
        })
        .cache('cumulativeCapEarlyAccessRound-' + this.roundNumber, 300000)
        .getRawOne();

    this.cumulativePOLCapPerProject = parseFloat(
      cumulativePOLCapPerProject || '0',
    );
    this.cumulativePOLCapPerUserPerProject = parseFloat(
      cumulativePOLCapPerUserPerProject || '0',
    );
  }
}
