import { UserRole } from "../role.enum";

export class CreateUserDto {
  email: string;
  name: string;
  surname: string;
  password: string;
  birthday: Date;
  role: UserRole;
}
