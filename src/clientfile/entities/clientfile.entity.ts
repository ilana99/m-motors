import { UserEntity } from '../../user/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  JoinColumn,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Status } from '../status.enum';
import { CarEntity } from '../../cars/entities/car.entity';

@Entity('clientfile')
export class ClientFileEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => CarEntity, (car) => car.clientFiles)
  @JoinColumn({ name: 'carId' })
  car: CarEntity;

  @Column()
  carId: number;

  @ManyToOne(() => UserEntity, (user) => user.clientFiles)
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column()
  userId: number;

  @Column({
    type: 'enum',
    enum: Status,
    default: Status.Pending,
  })
  status: Status;

  @CreateDateColumn({ type: 'date' })
  dateSubmitted: Date;

  @Column()
  identityCard: string;

  @Column()
  proofOfAddress: string;

  @Column({ default: false })
  insurance: boolean;

  @Column({ default: false })
  roadsideAssistance: boolean;

  @Column({ default: false })
  maintenance: boolean;

  @Column({ default: false })
  technicalControl: boolean;
}
