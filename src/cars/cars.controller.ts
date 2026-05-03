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
import { diskStorage } from 'multer';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../user/role.enum';

const carImagesInterceptor = FilesInterceptor('files', 10, {
  storage: diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => {
      const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const extension = extname(file.originalname);
      cb(null, uniqueName + extension);
    },
  }),
});

@UseGuards(AuthGuard, RolesGuard)
@Controller('cars')
export class CarsController {
  constructor(private readonly carsService: CarsService) { }

  @Roles(UserRole.Employee)
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
      dto.images = images.map((image) => `/uploads/${image.filename}`);
      return await this.carsService.create(dto);
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

  @Roles(UserRole.Employee, UserRole.User)
  @Get()
  async findAll() {
    try {
      return await this.carsService.findAll();
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
  @Get('service/:service')
  async findAllByService(@Param('service') service: string) {
    try {
      return await this.carsService.findAllByService(service);
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

  @Roles(UserRole.Employee, UserRole.User)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      return await this.carsService.findOne(+id);
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
  @UseInterceptors(carImagesInterceptor)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCarDto: UpdateCarDto,
    @UploadedFiles() images: Array<Express.Multer.File>,
  ) {
    const dto = {
      ...updateCarDto,
    };
    if (images && images.length > 0) {
      dto.images = images.map((image) => `/uploads/${image.filename}`);
    }
    return this.carsService.update(+id, dto);
  }

  @Roles(UserRole.Employee)
  @Patch(':id/service')
  updateService(@Param('id') id: string, @Query('service') service: Service) {
    return this.carsService.updateService(+id, service);
  }

  @Roles(UserRole.Employee)
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
  @Delete(':id/image')
  async deleteImage(@Param('id') id: string, @Body('url') url: string) {
    if (!url) {
      throw new HttpException(
        { status: HttpStatus.BAD_REQUEST, error: 'Image URL is required' },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      return await this.carsService.deleteImage(+id, url);
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
