import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Req,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireProjectRole } from '../projects/decorators/require-project-role.decorator';
import { ProjectRole } from '../projects/enums/project-role.enum';
import { ProjectPermissionGuard } from '../projects/guards/project-permission.guard';
import { AttachmentsService } from './attachments.service';
import { AttachmentResponseDto } from './dto/attachment-response.dto';
import { AttachmentEntityType } from './entities/attachment.entity';
import { CustomLogger } from '../common/services/logger.service';

@ApiTags('Attachments')
@Controller('projects/:projectId')
@UseGuards(JwtAuthGuard, ProjectPermissionGuard)
@ApiBearerAuth()
@ApiHeader({
  name: 'Accept-Language',
  description: 'Language for error messages',
  required: false,
})
export class AttachmentsController {
  constructor(
    private readonly attachmentsService: AttachmentsService,
    private readonly logger: CustomLogger,
  ) {
    this.logger.setContext('AttachmentsController');
  }

  // Project Attachments
  @Post('attachments')
  @RequireProjectRole(ProjectRole.WRITE)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const randomName = uuidv4();
          return cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  @ApiOperation({
    summary: 'Upload project attachment',
    description:
      'Upload a file attachment to a project. Requires WRITE permission.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description:
            'File to upload (PDF, DOC, DOCX, TXT, CSV, XLS, XLSX, images)',
        },
      },
      required: ['file'],
    },
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 201,
    description: 'Attachment uploaded successfully',
    type: AttachmentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file type or size',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  async uploadProjectAttachment(
    @Param('projectId') projectId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({
            fileType:
              /\.(pdf|doc|docx|txt|csv|xls|xlsx|jpg|jpeg|png|gif|webp)$/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Req() req: any,
  ): Promise<AttachmentResponseDto> {
    return this.attachmentsService.uploadAttachment(
      file,
      AttachmentEntityType.PROJECT,
      projectId,
      req.user.id,
      projectId,
      req.headers['accept-language'],
    );
  }

  @Get('attachments')
  @RequireProjectRole(ProjectRole.READ)
  @ApiOperation({
    summary: 'Get project attachments',
    description: 'Get all attachments for a project. Requires READ permission.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Project attachments retrieved successfully',
    type: [AttachmentResponseDto],
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  async getProjectAttachments(
    @Param('projectId') projectId: string,
    @Req() req: any,
  ): Promise<AttachmentResponseDto[]> {
    return this.attachmentsService.getAttachments(
      AttachmentEntityType.PROJECT,
      projectId,
      projectId,
      req.user.id,
      req.headers['accept-language'],
    );
  }

  @Delete('attachments/:attachmentId')
  @RequireProjectRole(ProjectRole.READ)
  @ApiOperation({
    summary: 'Delete project attachment',
    description:
      'Delete a project attachment. Can be deleted by uploader or project admin.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'attachmentId',
    description: 'Attachment ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Attachment deleted successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Cannot delete attachment (not uploader or admin)',
  })
  @ApiResponse({
    status: 404,
    description: 'Attachment not found',
  })
  async deleteProjectAttachment(
    @Param('projectId') projectId: string,
    @Param('attachmentId') attachmentId: string,
    @Req() req: any,
  ): Promise<void> {
    return this.attachmentsService.deleteAttachment(
      attachmentId,
      projectId,
      req.user.id,
      req.headers['accept-language'],
    );
  }

  @Get('attachments/:attachmentId')
  @RequireProjectRole(ProjectRole.READ)
  @ApiOperation({
    summary: 'Get project attachment by ID',
    description:
      'Get a specific project attachment by ID. Requires READ permission.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'attachmentId',
    description: 'Attachment ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Project attachment retrieved successfully',
    type: AttachmentResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Attachment not found',
  })
  async getProjectAttachmentById(
    @Param('projectId') projectId: string,
    @Param('attachmentId') attachmentId: string,
    @Req() req: any,
  ): Promise<AttachmentResponseDto> {
    return this.attachmentsService.getAttachmentById(
      attachmentId,
      projectId,
      req.user.id,
      req.headers['accept-language'],
    );
  }

  // Task Attachments
  @Post('tasks/:taskId/attachments')
  @RequireProjectRole(ProjectRole.READ)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const randomName = uuidv4();
          return cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  @ApiOperation({
    summary: 'Upload task attachment',
    description:
      'Upload a file attachment to a task. Requires READ permission.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description:
            'File to upload (PDF, DOC, DOCX, TXT, CSV, XLS, XLSX, images)',
        },
      },
      required: ['file'],
    },
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'taskId',
    description: 'Task ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 201,
    description: 'Attachment uploaded successfully',
    type: AttachmentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file type or size',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  async uploadTaskAttachment(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({
            fileType:
              /\.(pdf|doc|docx|txt|csv|xls|xlsx|jpg|jpeg|png|gif|webp)$/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Req() req: any,
  ): Promise<AttachmentResponseDto> {
    return this.attachmentsService.uploadAttachment(
      file,
      AttachmentEntityType.TASK,
      taskId,
      req.user.id,
      projectId,
      req.headers['accept-language'],
    );
  }

  @Get('tasks/:taskId/attachments')
  @RequireProjectRole(ProjectRole.READ)
  @ApiOperation({
    summary: 'Get task attachments',
    description: 'Get all attachments for a task. Requires READ permission.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'taskId',
    description: 'Task ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Task attachments retrieved successfully',
    type: [AttachmentResponseDto],
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  async getTaskAttachments(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Req() req: any,
  ): Promise<AttachmentResponseDto[]> {
    return this.attachmentsService.getAttachments(
      AttachmentEntityType.TASK,
      taskId,
      projectId,
      req.user.id,
      req.headers['accept-language'],
    );
  }

  @Delete('tasks/:taskId/attachments/:attachmentId')
  @RequireProjectRole(ProjectRole.READ)
  @ApiOperation({
    summary: 'Delete task attachment',
    description:
      'Delete a task attachment. Can be deleted by uploader or project admin.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'taskId',
    description: 'Task ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'attachmentId',
    description: 'Attachment ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Attachment deleted successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Cannot delete attachment (not uploader or admin)',
  })
  @ApiResponse({
    status: 404,
    description: 'Attachment not found',
  })
  async deleteTaskAttachment(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Param('attachmentId') attachmentId: string,
    @Req() req: any,
  ): Promise<void> {
    return this.attachmentsService.deleteAttachment(
      attachmentId,
      projectId,
      req.user.id,
      req.headers['accept-language'],
    );
  }

  @Get('tasks/:taskId/attachments/:attachmentId')
  @RequireProjectRole(ProjectRole.READ)
  @ApiOperation({
    summary: 'Get task attachment by ID',
    description:
      'Get a specific task attachment by ID. Requires READ permission.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'taskId',
    description: 'Task ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'attachmentId',
    description: 'Attachment ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Task attachment retrieved successfully',
    type: AttachmentResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Attachment not found',
  })
  async getTaskAttachmentById(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Param('attachmentId') attachmentId: string,
    @Req() req: any,
  ): Promise<AttachmentResponseDto> {
    return this.attachmentsService.getAttachmentById(
      attachmentId,
      projectId,
      req.user.id,
      req.headers['accept-language'],
    );
  }
}
