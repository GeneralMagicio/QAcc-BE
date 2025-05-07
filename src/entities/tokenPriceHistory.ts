import { Field, ID, ObjectType, Float } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  BaseEntity,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity()
@ObjectType()
@Index(['tokenAddress', 'timestamp'], { unique: true })
export class TokenPriceHistory extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field(_type => String)
  @Column()
  token: string;

  @Field(_type => String)
  @Column()
  tokenAddress: string;

  @Field(_type => Float)
  @Column('float')
  price: number;

  @Field(_type => Float, { nullable: true })
  @Column('float', { nullable: true })
  priceUSD: number;

  @Field(_type => Float, { nullable: true })
  @Column('float', { nullable: true })
  marketCap: number;

  @Field()
  @CreateDateColumn()
  timestamp: Date;
}
