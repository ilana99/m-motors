import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Service } from '../service.enum';

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

  @Column({ type: 'json', nullable: true })
  images: string[];
}
