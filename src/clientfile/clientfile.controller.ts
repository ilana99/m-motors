import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  BadRequestException,
  ParseIntPipe,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Req,
} from '@nestjs/common';
import { ClientfileService } from './clientfile.service';
import { CreateClientfileDto } from './dto/create-clientfile.dto';
import { UpdateClientfileDto } from './dto/update-clientfile.dto';
import { BaseClientfileDto } from './dto/base-clientfile.dto';
import { SupabaseStorageService } from '../utilities/supabase-storage/supabase-storage.service';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { extname } from 'path';
import { memoryStorage } from 'multer';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../user/role.enum';
import { Status } from './status.enum';
import { AuthenticatedRequest } from '../auth/type/authenticated-request.type';
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

const clientfileFilesInterceptor = FileFieldsInterceptor(
  [
    { name: 'identityCard', maxCount: 1 },
    { name: 'proofOfAddress', maxCount: 1 },
  ],
  {
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
  },
);

type ClientfileFiles = {
  identityCard?: Array<Express.Multer.File>;
  proofOfAddress?: Array<Express.Multer.File>;
};

@Controller('clientfile')
export class ClientfileController {
  constructor(
    private readonly clientfileService: ClientfileService,
    private readonly supabaseStorageService: SupabaseStorageService,
  ) { }

  private async uploadFile(file: Express.Multer.File, folder: string) {
    if (!file.buffer) {
      throw new BadRequestException('File buffer is missing');
    }

    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const extension = extname(file.originalname);
    const path = `clientfiles/${folder}/${uniqueName}${extension}`;

    return this.supabaseStorageService.uploadFile(file, path);
  }

  @Roles(UserRole.User)
  @UseGuards(AuthGuard, RolesGuard)
  @UseInterceptors(clientfileFilesInterceptor)
  @Post()
  @ApiCookieAuth()
  @ApiCreatedResponse()
  @ApiBadRequestResponse({
    description:
      'Only image files are allowed | File buffer is missing | Identity card and proof of address are required | Leasing options are required | Options are only available for leasing cars | User already has a pending clientfile | Car is not available',
  })
  @ApiUnauthorizedResponse({
    description: 'No token provided | Invalid or expired token',
  })
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiConsumes('multipart/form-data')
  async create(
    @Body() createClientfileDto: CreateClientfileDto,
    @UploadedFiles() files: ClientfileFiles,
    @Req() req: AuthenticatedRequest,
  ) {
    const dto = {
      ...createClientfileDto,
      userId: req.user.sub.toString(),
    };

    await this.clientfileService.checkCreate(
      req.user.sub,
      Number(createClientfileDto.carId),
    );

    const identityCard = files?.identityCard?.[0];
    const proofOfAddress = files?.proofOfAddress?.[0];

    if (!identityCard || !proofOfAddress) {
      throw new BadRequestException(
        'Identity card and proof of address are required',
      );
    }

    dto.identityCard = await this.uploadFile(identityCard, 'identity-card');
    dto.proofOfAddress = await this.uploadFile(
      proofOfAddress,
      'proof-of-address',
    );

    return await this.clientfileService.create(dto);
  }

  @Roles(UserRole.Employee)
  @UseGuards(AuthGuard, RolesGuard)
  @Get()
  @ApiCookieAuth()
  @ApiOkResponse({ type: [BaseClientfileDto] })
  @ApiUnauthorizedResponse({
    description: 'No token provided | Invalid or expired token',
  })
  @ApiForbiddenResponse()
  async findAll(@Req() req: AuthenticatedRequest) {
    return await this.clientfileService.findAll(req.user.role, req.user.sub);
  }

  @Get('me')
  @Roles(UserRole.User)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiCookieAuth()
  @ApiOkResponse({ type: [BaseClientfileDto] })
  @ApiUnauthorizedResponse({
    description: 'No token provided | Invalid or expired token',
  })
  @ApiForbiddenResponse()
  async findMine(@Req() req: AuthenticatedRequest) {
    return await this.clientfileService.findAll(req.user.role, req.user.sub);
  }

  @Get('status/:status')
  @Roles(UserRole.Employee)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiCookieAuth()
  @ApiOkResponse({ type: [BaseClientfileDto] })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse({
    description: 'No token provided | Invalid or expired token',
  })
  @ApiForbiddenResponse()
  async findAllByStatus(@Param('status') status: Status) {
    return await this.clientfileService.findAllByStatus(status);
  }

  @Get(':id')
  @Roles(UserRole.Employee, UserRole.User)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiCookieAuth()
  @ApiOkResponse({ type: BaseClientfileDto })
  @ApiUnauthorizedResponse({
    description: 'No token provided | Invalid or expired token',
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions | User cannot access other user file',
  })
  @ApiNotFoundResponse()
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return await this.clientfileService.findOne(
      req.user.role,
      req.user.sub,
      id,
    );
  }

  @Roles(UserRole.User, UserRole.Employee)
  @UseGuards(AuthGuard, RolesGuard)
  @UseInterceptors(clientfileFilesInterceptor)
  @Patch(':id')
  @ApiCookieAuth()
  @ApiOkResponse({ type: BaseClientfileDto })
  @ApiBadRequestResponse({
    description:
      'Only image files are allowed | File buffer is missing | Cannot update canceled client file | Cannot update already rejected client file | Cannot update already accepted client file | Options are only available for leasing cars',
  })
  @ApiUnauthorizedResponse({
    description: 'No token provided | Invalid or expired token',
  })
  @ApiForbiddenResponse({
    description:
      'Insufficient permissions | User cannot update another user file',
  })
  @ApiNotFoundResponse()
  @ApiConsumes('multipart/form-data')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateClientfileDto: UpdateClientfileDto,
    @UploadedFiles() files: ClientfileFiles,
    @Req() req: AuthenticatedRequest,
  ) {
    const dto = {
      ...updateClientfileDto,
    };
    const identityCard = files?.identityCard?.[0];
    const proofOfAddress = files?.proofOfAddress?.[0];

    await this.clientfileService.checkUpdate(req.user.role, req.user.sub, id);

    if (identityCard) {
      dto.identityCard = await this.uploadFile(identityCard, 'identity-cards');
    }
    if (proofOfAddress) {
      dto.proofOfAddress = await this.uploadFile(
        proofOfAddress,
        'proof-of-address',
      );
    }

    return await this.clientfileService.update(
      req.user.role,
      req.user.sub,
      id,
      dto,
    );
  }

  @Roles(UserRole.Employee)
  @UseGuards(AuthGuard, RolesGuard)
  @Patch(':id/status')
  @ApiCookieAuth()
  @ApiOkResponse({ type: BaseClientfileDto })
  @ApiBadRequestResponse({
    description:
      'Invalid status | Only pending status client files can be updated | Car is not available',
  })
  @ApiUnauthorizedResponse({
    description: 'No token provided | Invalid or expired token',
  })
  @ApiForbiddenResponse()
  @ApiNotFoundResponse({
    description: 'Clientfile with id 1 not found | Car with id 1 not found',
  })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Query('status') status: Status,
  ) {
    return await this.clientfileService.updateStatus(id, status);
  }

  @Roles(UserRole.User)
  @UseGuards(AuthGuard, RolesGuard)
  @Post('me/cancel')
  @ApiCookieAuth()
  @ApiCreatedResponse({ type: [BaseClientfileDto] })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse({
    description: 'No token provided | Invalid or expired token',
  })
  @ApiForbiddenResponse({
    description:
      'Insufficient permissions | User cannot cancel anoter user submission',
  })
  async cancelSubmission(@Req() req: AuthenticatedRequest) {
    return await this.clientfileService.cancelSubmission(
      req.user.sub,
      req.user.role,
    );
  }

  @Roles(UserRole.Employee)
  @UseGuards(AuthGuard, RolesGuard)
  @Delete(':id')
  @ApiCookieAuth()
  @ApiOkResponse()
  @ApiUnauthorizedResponse({
    description: 'No token provided | Invalid or expired token',
  })
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.clientfileService.remove(id);
  }
}
