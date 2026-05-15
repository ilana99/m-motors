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
  ParseIntPipe,
} from '@nestjs/common';
import { CarsService } from './cars.service';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';
import { baseCarDto } from './dto/base-car.dto';
import { Service } from './service.enum';
import { FilesInterceptor } from '@nestjs/platform-express';
import { extname } from 'path';
import { memoryStorage } from 'multer';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../user/role.enum';
import { SupabaseStorageService } from '../utilities/supabase-storage/supabase-storage.service';
import {
  ApiBadRequestResponse,
  ApiConsumes,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

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
  ) { }

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
  @ApiCookieAuth('employee_access_token')
  @ApiCreatedResponse({
    schema: {
      type: 'object',
      properties: {
        brand: { type: 'string', example: 'Genesis' },
        model: { type: 'string', example: 'GV80' },
        price: { type: 'string', example: '5000' },
        service: { type: 'string', example: Service.Leasing },
        images: {
          type: 'array',
          items: { type: 'string' },
          nullable: true,
          example: null,
        },
        id: { type: 'number', example: 49 },
        isAvailable: { type: 'boolean', example: true },
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'Invalid service | Only image files are allowed | Image file buffer is missing',
  })
  @ApiUnauthorizedResponse({
    description: 'No token provided | Invalid or expired token',
  })
  @ApiForbiddenResponse()
  @ApiConsumes('multipart/form-data')
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
  @ApiOkResponse({ type: [baseCarDto] })
  async findAll() {
    const cars = await this.carsService.findAll();
    return cars.map((car) => this.withImageUrls(car));
  }

  @Roles(UserRole.Employee, UserRole.User)
  @UseGuards(AuthGuard, RolesGuard)
  @Get('service/:service')
  @ApiCookieAuth('user_access_token')
  @ApiCookieAuth('employee_access_token')
  @ApiOkResponse({ type: [baseCarDto] })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse({
    description: 'No token provided | Invalid or expired token',
  })
  @ApiForbiddenResponse()
  async findAllByService(@Param('service') service: Service) {
    const cars = await this.carsService.findAllByService(service);
    return cars.map((car) => this.withImageUrls(car));
  }

  @Get('status/:status')
  @ApiOkResponse({ type: [baseCarDto] })
  @ApiBadRequestResponse()
  async findAllByStatus(@Param('status') status: string) {
    const cars = await this.carsService.findAllByStatus(status);
    return cars.map((car) => this.withImageUrls(car));
  }

  @Get(':id')
  @ApiOkResponse({ type: baseCarDto })
  @ApiNotFoundResponse()
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const car = await this.carsService.findOne(id);
    return this.withImageUrls(car);
  }

  @Roles(UserRole.Employee)
  @UseGuards(AuthGuard, RolesGuard)
  @Get(':id/clientfiles')
  @ApiCookieAuth('employee_access_token')
  @ApiOkResponse({ type: baseCarDto })
  @ApiUnauthorizedResponse({
    description: 'No token provided | Invalid or expired token',
  })
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async findOneWithClientfiles(@Param('id', ParseIntPipe) id: number) {
    const car = await this.carsService.findOneForEmployees(id);
    return this.withImageUrls(car);
  }

  @Roles(UserRole.Employee)
  @UseGuards(AuthGuard, RolesGuard)
  @UseInterceptors(carImagesInterceptor)
  @Patch(':id')
  @ApiCookieAuth('employee_access_token')
  @ApiOkResponse()
  @ApiBadRequestResponse({
    description: 'Only image files are allowed | Image file buffer is missing',
  })
  @ApiUnauthorizedResponse({
    description: 'No token provided | Invalid or expired token',
  })
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiConsumes('multipart/form-data')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCarDto: UpdateCarDto,
    @UploadedFiles() images: Array<Express.Multer.File>,
  ) {
    const dto = { ...updateCarDto };

    if (images && images.length > 0) {
      dto.images = await this.uploadImages(images);
    }

    const car = await this.carsService.update(id, dto);
    return this.withImageUrls(car);
  }

  @Roles(UserRole.Employee)
  @UseGuards(AuthGuard, RolesGuard)
  @Patch(':id/service')
  @ApiCookieAuth('employee_access_token')
  @ApiOkResponse()
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse({
    description: 'No token provided | Invalid or expired token',
  })
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async updateService(
    @Param('id', ParseIntPipe) id: number,
    @Query('service') service: Service,
  ) {
    return await this.carsService.updateService(id, service);
  }

  @Roles(UserRole.Employee)
  @UseGuards(AuthGuard, RolesGuard)
  @Delete(':id')
  @ApiCookieAuth('employee_access_token')
  @ApiOkResponse()
  @ApiUnauthorizedResponse({
    description: 'No token provided | Invalid or expired token',
  })
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.carsService.remove(id);
  }

  @Roles(UserRole.Employee)
  @UseGuards(AuthGuard, RolesGuard)
  @Delete(':id/image')
  @ApiCookieAuth('employee_access_token')
  @ApiOkResponse()
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse({
    description: 'No token provided | Invalid or expired token',
  })
  @ApiForbiddenResponse()
  @ApiNotFoundResponse({
    description: 'Car with id 1 not found | Could not find image',
  })
  async deleteImage(@Param('id', ParseIntPipe) id: number, @Body('url') url: string) {
    if (!url) {
      throw new BadRequestException('Image URL is required');
    }

    const car = await this.carsService.deleteImage(id, url);
    return this.withImageUrls(car);
  }
}
