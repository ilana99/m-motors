import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpException,
  HttpStatus,
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
import { SupabaseStorageService } from '../supabase-storage/supabase-storage.service';

const carImagesInterceptor = FilesInterceptor('images', 10, {
  storage: memoryStorage(),
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
          throw new Error('Image file buffer is missing');
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
    try {
      const dto = {
        ...createCarDto,
      };
      const uploadedImages = await this.uploadImages(images);
      if (uploadedImages) {
        dto.images = uploadedImages;
      }
      const car = await this.carsService.create(dto);
      return this.withImageUrls(car);
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Failed to add car',
        },
        HttpStatus.BAD_REQUEST,
        {
          cause: error,
        },
      );
    }
  }

  @Get()
  async findAll() {
    try {
      const cars = await this.carsService.findAll();
      return cars.map((car) => this.withImageUrls(car));
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'No cars found',
        },
        HttpStatus.NOT_FOUND,
        {
          cause: error,
        },
      );
    }
  }

  @Roles(UserRole.Employee, UserRole.User)
  @UseGuards(AuthGuard, RolesGuard)
  @Get('service/:service')
  async findAllByService(@Param('service') service: string) {
    try {
      const cars = await this.carsService.findAllByService(service);
      return cars.map((car) => this.withImageUrls(car));
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: `No cars found with service: ${service}`,
        },
        HttpStatus.NOT_FOUND,
        {
          cause: error,
        },
      );
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const car = await this.carsService.findOne(+id);
      return this.withImageUrls(car);
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: `Car with id ${id} not found`,
        },
        HttpStatus.NOT_FOUND,
        {
          cause: error,
        },
      );
    }
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
    const dto = {
      ...updateCarDto,
    };
    if (images && images.length > 0) {
      dto.images = await this.uploadImages(images);
    }
    const car = await this.carsService.update(+id, dto);
    return this.withImageUrls(car);
  }

  @Roles(UserRole.Employee)
  @UseGuards(AuthGuard, RolesGuard)
  @Patch(':id/service')
  updateService(@Param('id') id: string, @Query('service') service: Service) {
    return this.carsService.updateService(+id, service);
  }

  @Roles(UserRole.Employee)
  @UseGuards(AuthGuard, RolesGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      await this.carsService.remove(+id);
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: `Failed to remove car with id ${id}`,
        },
        HttpStatus.NOT_FOUND,
        {
          cause: error,
        },
      );
    }
  }

  @Roles(UserRole.Employee)
  @UseGuards(AuthGuard, RolesGuard)
  @Delete(':id/image')
  async deleteImage(@Param('id') id: string, @Body('url') url: string) {
    if (!url) {
      throw new HttpException(
        { status: HttpStatus.BAD_REQUEST, error: 'Image URL is required' },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const car = await this.carsService.deleteImage(+id, url);
      return this.withImageUrls(car);
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: `Failed to remove image for car ${id}`,
        },
        HttpStatus.NOT_FOUND,
        { cause: error },
      );
    }
  }
}
