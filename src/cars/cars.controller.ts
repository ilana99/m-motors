import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  BadRequestException,
  Query,
  UseInterceptors,
  UploadedFiles,
  UseGuards,
} from '@nestjs/common';
import { CarsService } from './cars.service';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';
import { Service } from './service.enum';
import { FilesInterceptor } from '@nestjs/platform-express';
import { extname } from 'path';
import { memoryStorage } from 'multer';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../user/role.enum';
import { SupabaseStorageService } from '../utilities/supabase-storage/supabase-storage.service';

const carImagesInterceptor = FilesInterceptor('images', 10, {
  storage: memoryStorage(),
  fileFilter: (req, file, callback) => {
    if (!file.mimetype.startsWith('image/')) {
      return callback(
        new BadRequestException('Only image files are allowed'),
        false,
      );
    }
    callback(null, true);
  },
});

type CarWithImages = {
  images?: string[];
};

@Controller('cars')
export class CarsController {
  constructor(
    private readonly carsService: CarsService,
    private readonly supabaseStorageService: SupabaseStorageService,
  ) {}

  private async uploadImages(images?: Array<Express.Multer.File>) {
    if (!images || images.length === 0) {
      return undefined;
    }

    return Promise.all(
      images.map((image) => {
        if (!image.buffer) {
          throw new BadRequestException('Image file buffer is missing');
        }

        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const extension = extname(image.originalname);
        const path = `cars/${uniqueName}${extension}`;

        return this.supabaseStorageService.uploadFile(image, path);
      }),
    );
  }

  private getImageUrl(image: string): string {
    if (image.startsWith('http://') || image.startsWith('https://')) {
      return image;
    }

    const apiUrl = process.env.API_URL;
    return apiUrl ? new URL(image, apiUrl).toString() : image;
  }

  private withImageUrls(car: CarWithImages) {
    if (!car.images) {
      return car;
    }

    return {
      ...car,
      images: car.images.map((image) => this.getImageUrl(image)),
    };
  }

  @Roles(UserRole.Employee)
  @UseGuards(AuthGuard, RolesGuard)
  @UseInterceptors(carImagesInterceptor)
  @Post()
  async create(
    @Body() createCarDto: CreateCarDto,
    @UploadedFiles() images: Array<Express.Multer.File>,
  ) {
    const dto = {
      ...createCarDto,
    };
    const uploadedImages = await this.uploadImages(images);
    if (uploadedImages) {
      dto.images = uploadedImages;
    }
    const car = await this.carsService.create(dto);
    return this.withImageUrls(car);
  }

  @Get()
  async findAll() {
    const cars = await this.carsService.findAll();
    return cars.map((car) => this.withImageUrls(car));
  }

  @Roles(UserRole.Employee, UserRole.User)
  @UseGuards(AuthGuard, RolesGuard)
  @Get('service/:service')
  async findAllByService(@Param('service') service: Service) {
    const cars = await this.carsService.findAllByService(service);
    return cars.map((car) => this.withImageUrls(car));
  }

  @Get('status/:status')
  async findAllByStatus(@Param('status') status: string) {
    const cars = await this.carsService.findAllByStatus(status);
    return cars.map((car) => this.withImageUrls(car));
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const car = await this.carsService.findOne(+id);
    return this.withImageUrls(car);
  }

  @Roles(UserRole.Employee)
  @UseGuards(AuthGuard, RolesGuard)
  @UseInterceptors(carImagesInterceptor)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCarDto: UpdateCarDto,
    @UploadedFiles() images: Array<Express.Multer.File>,
  ) {
    const dto = { ...updateCarDto };

    if (images && images.length > 0) {
      dto.images = await this.uploadImages(images);
    }

    const car = await this.carsService.update(+id, dto);
    return this.withImageUrls(car);
  }

  @Roles(UserRole.Employee)
  @UseGuards(AuthGuard, RolesGuard)
  @Patch(':id/service')
  async updateService(
    @Param('id') id: string,
    @Query('service') service: Service,
  ) {
    return await this.carsService.updateService(+id, service);
  }

  @Roles(UserRole.Employee)
  @UseGuards(AuthGuard, RolesGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.carsService.remove(+id);
  }

  @Roles(UserRole.Employee)
  @UseGuards(AuthGuard, RolesGuard)
  @Delete(':id/image')
  async deleteImage(@Param('id') id: string, @Body('url') url: string) {
    if (!url) {
      throw new BadRequestException('Image URL is required');
    }

    const car = await this.carsService.deleteImage(+id, url);
    return this.withImageUrls(car);
  }
}
