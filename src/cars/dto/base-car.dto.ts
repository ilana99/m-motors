import { Status } from '../../clientfile/status.enum';

export class baseCarDto {
  id: string;
  brand: string;
  model: string;
  price: string;
  service?: string;
  images: string[];
  isAvailable: boolean;
  clientFiles?: carClientfileDto[];
}

export class carClientfileDto {
  id: string;
  userId: string;
  name: string;
  surname: string;
  status: Status;
}
