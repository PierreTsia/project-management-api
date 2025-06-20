import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Headers,
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireProjectRole } from '../projects/decorators/require-project-role.decorator';
import { ProjectRole } from '../projects/enums/project-role.enum';
import { ProjectPermissionGuard } from '../projects/guards/project-permission.guard';
import { AttachmentsService } from './attachments.service';
import { AttachmentResponseDto } from './dto/attachment-response.dto';
import { CustomLogger } from '../common/services/logger.service';
import { User } from '../users/entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AttachmentEntityType } from './entities/attachment.entity';

// Reusable API schemas
const FILE_UPLOAD_SCHEMA = {
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
};

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
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload project attachment' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: FILE_UPLOAD_SCHEMA })
  @ApiParam({ name: 'projectId' })
  @ApiResponse({ status: 201, type: AttachmentResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async uploadProjectAttachment(
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
    @Headers('accept-language') acceptLanguage: string = 'en',
  ): Promise<AttachmentResponseDto> {
    return this.attachmentsService.uploadAttachment(
      file,
      AttachmentEntityType.PROJECT,
      projectId,
      user.id,
      projectId,
      acceptLanguage,
    );
  }

  @Get('attachments')
  @RequireProjectRole(ProjectRole.READ)
  @ApiOperation({ summary: 'Get project attachments' })
  @ApiParam({ name: 'projectId' })
  @ApiResponse({ status: 200, type: [AttachmentResponseDto] })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async getProjectAttachments(
    @Param('projectId') projectId: string,
    @CurrentUser() user: User,
    @Headers('accept-language') acceptLanguage: string = 'en',
  ): Promise<AttachmentResponseDto[]> {
    return this.attachmentsService.getAttachments(
      AttachmentEntityType.PROJECT,
      projectId,
      projectId,
      user.id,
      acceptLanguage,
    );
  }

  @Delete('attachments/:attachmentId')
  @RequireProjectRole(ProjectRole.WRITE)
  @ApiOperation({ summary: 'Delete project attachment' })
  @ApiParam({ name: 'projectId' })
  @ApiParam({ name: 'attachmentId' })
  @ApiResponse({ status: 200 })
  @ApiResponse({
    status: 403,
    description: 'Cannot delete attachment (not uploader or admin)',
  })
  @ApiResponse({ status: 404, description: 'Attachment not found' })
  async deleteProjectAttachment(
    @Param('projectId') projectId: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: User,
    @Headers('accept-language') acceptLanguage: string = 'en',
  ): Promise<void> {
    return this.attachmentsService.deleteAttachment(
      attachmentId,
      projectId,
      user.id,
      acceptLanguage,
    );
  }

  @Get('attachments/:attachmentId')
  @RequireProjectRole(ProjectRole.READ)
  @ApiOperation({ summary: 'Get project attachment by ID' })
  @ApiParam({ name: 'projectId' })
  @ApiParam({ name: 'attachmentId' })
  @ApiResponse({ status: 200, type: AttachmentResponseDto })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Attachment not found' })
  async getProjectAttachmentById(
    @Param('projectId') projectId: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: User,
    @Headers('accept-language') acceptLanguage: string = 'en',
  ): Promise<AttachmentResponseDto> {
    return this.attachmentsService.getAttachmentById(
      attachmentId,
      projectId,
      user.id,
      acceptLanguage,
    );
  }

  // Task Attachments
  @Post('tasks/:taskId/attachments')
  @RequireProjectRole(ProjectRole.WRITE)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload task attachment' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: FILE_UPLOAD_SCHEMA })
  @ApiParam({ name: 'projectId' })
  @ApiParam({ name: 'taskId' })
  @ApiResponse({ status: 201, type: AttachmentResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async uploadTaskAttachment(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
    @Headers('accept-language') acceptLanguage: string = 'en',
  ): Promise<AttachmentResponseDto> {
    return this.attachmentsService.uploadAttachment(
      file,
      AttachmentEntityType.TASK,
      taskId,
      user.id,
      projectId,
      acceptLanguage,
    );
  }

  @Get('tasks/:taskId/attachments')
  @RequireProjectRole(ProjectRole.READ)
  @ApiOperation({ summary: 'Get task attachments' })
  @ApiParam({ name: 'projectId' })
  @ApiParam({ name: 'taskId' })
  @ApiResponse({ status: 200, type: [AttachmentResponseDto] })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async getTaskAttachments(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: User,
    @Headers('accept-language') acceptLanguage: string = 'en',
  ): Promise<AttachmentResponseDto[]> {
    return this.attachmentsService.getAttachments(
      AttachmentEntityType.TASK,
      taskId,
      projectId,
      user.id,
      acceptLanguage,
    );
  }

  @Delete('tasks/:taskId/attachments/:attachmentId')
  @RequireProjectRole(ProjectRole.WRITE)
  @ApiOperation({ summary: 'Delete task attachment' })
  @ApiParam({ name: 'projectId' })
  @ApiParam({ name: 'taskId' })
  @ApiParam({ name: 'attachmentId' })
  @ApiResponse({ status: 200 })
  @ApiResponse({
    status: 403,
    description: 'Cannot delete attachment (not uploader or admin)',
  })
  @ApiResponse({ status: 404, description: 'Attachment not found' })
  async deleteTaskAttachment(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: User,
    @Headers('accept-language') acceptLanguage: string = 'en',
  ): Promise<void> {
    return this.attachmentsService.deleteAttachment(
      attachmentId,
      projectId,
      user.id,
      acceptLanguage,
    );
  }

  @Get('tasks/:taskId/attachments/:attachmentId')
  @RequireProjectRole(ProjectRole.READ)
  @ApiOperation({ summary: 'Get task attachment by ID' })
  @ApiParam({ name: 'projectId' })
  @ApiParam({ name: 'taskId' })
  @ApiParam({ name: 'attachmentId' })
  @ApiResponse({ status: 200, type: AttachmentResponseDto })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Attachment not found' })
  async getTaskAttachmentById(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: User,
    @Headers('accept-language') acceptLanguage: string = 'en',
  ): Promise<AttachmentResponseDto> {
    return this.attachmentsService.getAttachmentById(
      attachmentId,
      projectId,
      user.id,
      acceptLanguage,
    );
  }
}
