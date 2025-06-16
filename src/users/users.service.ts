import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { MoreThan } from 'typeorm';
import { UpdateNameDto } from './dto/update-name.dto';
import { I18nService } from 'nestjs-i18n';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly i18n: I18nService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async findOne(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    await this.usersRepository.update(id, data);
    return this.findOne(id);
  }

  async create(data: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(data);
    return this.usersRepository.save(user);
  }

  async findByEmailConfirmationToken(token: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { emailConfirmationToken: token },
    });
  }

  async findByPasswordResetToken(token: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: {
        passwordResetToken: token,
        passwordResetExpires: MoreThan(new Date()),
      },
    });
  }

  async findByProviderId(
    provider: string,
    providerId: string,
  ): Promise<User | null> {
    return this.usersRepository.findOne({
      where: {
        provider,
        providerId,
      },
    });
  }

  async uploadAvatar(
    userId: string,
    file: Express.Multer.File,
    acceptLanguage?: string,
  ): Promise<User> {
    // Get current user to check for existing avatar
    const currentUser = await this.findOne(userId);

    if (!currentUser) {
      throw new NotFoundException({
        status: 404,
        code: 'USER.NOT_FOUND',
        message: this.i18n.translate('errors.user.not_found', {
          lang: acceptLanguage,
        }),
      });
    }

    // Upload new avatar
    const uploadResult = await this.cloudinaryService.uploadImage(
      file,
      userId,
      acceptLanguage,
    );

    try {
      // Update user's avatar URL
      await this.update(userId, { avatarUrl: uploadResult.url });
      const updatedUser = await this.findOne(userId);

      // Clean up old avatar if it exists and is a Cloudinary URL
      if (currentUser.avatarUrl) {
        const oldPublicId = this.cloudinaryService.extractPublicIdFromUrl(
          currentUser.avatarUrl,
        );
        if (oldPublicId) {
          try {
            await this.cloudinaryService.deleteImage(
              oldPublicId,
              acceptLanguage,
            );
          } catch (error) {
            // Log error but don't fail the operation
            console.error('Failed to delete old avatar:', {
              userId,
              oldPublicId,
              oldUrl: currentUser.avatarUrl,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        } else {
          // Not a Cloudinary URL (probably default avatar), no need to delete
          console.log('Skipping cleanup of non-Cloudinary avatar:', {
            userId,
            avatarUrl: currentUser.avatarUrl,
          });
        }
      }

      return updatedUser;
    } catch (error) {
      // If the update fails, try to clean up the newly uploaded image
      try {
        await this.cloudinaryService.deleteImage(
          uploadResult.publicId,
          acceptLanguage,
        );
      } catch (cleanupError) {
        console.error('Failed to clean up uploaded image after error:', {
          userId,
          publicId: uploadResult.publicId,
          error: error instanceof Error ? error.message : String(error),
          cleanupError:
            cleanupError instanceof Error
              ? cleanupError.message
              : String(cleanupError),
        });
      }
      throw error;
    }
  }

  async updateName(
    userId: string,
    updateNameDto: UpdateNameDto,
    acceptLanguage?: string,
  ): Promise<User> {
    const user = await this.findOne(userId);

    if (!user) {
      throw new NotFoundException({
        status: 404,
        code: 'USER.NOT_FOUND',
        message: this.i18n.translate('errors.user.not_found', {
          lang: acceptLanguage,
        }),
      });
    }

    await this.update(userId, { name: updateNameDto.name });
    return this.findOne(userId);
  }
}
