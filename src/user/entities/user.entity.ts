import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { UserRole } from '../role.enum';
import { ClientFileEntity } from '../../clientfile/entities/clientfile.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column()
  surname: string;

  @Column()
  password: string;

  @Column({
    type: 'date',
    transformer: {
      from: (value: string) => value,
      to: (value: string) => value,
    },
  })
  birthday: Date;

  @Column({
    type: 'enum',
    enum: UserRole,
  })
  role: UserRole;

  @OneToMany(() => ClientFileEntity, (clientFile) => clientFile.user)
  clientFiles?: ClientFileEntity[];
}
