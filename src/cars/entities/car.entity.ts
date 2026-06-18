import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Service } from '../service.enum';
import { ClientFileEntity } from '../../clientfile/entities/clientfile.entity';

@Entity('cars')
export class CarEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  brand: string;

  @Column()
  model: string;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
  })
  price: string;

  @Column({
    type: 'enum',
    enum: Service,
  })
  service: Service;

  @Column({ type: 'jsonb', nullable: true })
  images: string[];

  @OneToMany(() => ClientFileEntity, (clientFile) => clientFile.car)
  clientFiles?: ClientFileEntity[];

  @Column({ default: true })
  isAvailable: boolean;

}
