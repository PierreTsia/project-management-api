import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { MoreThan, LessThan } from 'typeorm';
import { UpdateNameDto } from './dto/update-name.dto';
import { I18nService } from 'nestjs-i18n';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CustomLogger } from '../common/services/logger.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly i18n: I18nService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly logger: CustomLogger,
  ) {
    this.logger.setContext('UsersService');
  }

  async findOne(id: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      this.logger.debug(`User not found with id: ${id}`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      this.logger.debug(`User not found with email: ${email}`);
    }
    return user;
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    this.logger.debug(`Updating user ${id} with data: ${JSON.stringify(data)}`);
    await this.usersRepository.update(id, data);
    return this.findOne(id);
  }

  async create(data: Partial<User>): Promise<User> {
    this.logger.debug(`Creating new user with email: ${data.email}`);
    const user = this.usersRepository.create(data);
    const savedUser = await this.usersRepository.save(user);
    this.logger.log(`User created successfully with id: ${savedUser.id}`);
    return savedUser;
  }

  async findByEmailConfirmationToken(token: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({
      where: { emailConfirmationToken: token },
    });
    if (!user) {
      this.logger.debug(`No user found with confirmation token: ${token}`);
    }
    return user;
  }

  async findByPasswordResetToken(token: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({
      where: {
        passwordResetToken: token,
        passwordResetExpires: MoreThan(new Date()),
      },
    });
    if (!user) {
      this.logger.debug(
        `No user found with valid password reset token: ${token}`,
      );
    }
    return user;
  }

  async findByProviderId(
    provider: string,
    providerId: string,
  ): Promise<User | null> {
    const user = await this.usersRepository.findOne({
      where: {
        provider,
        providerId,
      },
    });
    if (!user) {
      this.logger.debug(
        `No user found with provider ${provider} and id ${providerId}`,
      );
    }
    return user;
  }

  async uploadAvatar(
    userId: string,
    file: Express.Multer.File,
    acceptLanguage?: string,
  ): Promise<User> {
    // Get current user to check for existing avatar
    const currentUser = await this.findOne(userId);

    if (!currentUser) {
      this.logger.warn(`User not found for avatar upload: ${userId}`);
      throw new NotFoundException({
        status: 404,
        code: 'USER.NOT_FOUND',
        message: this.i18n.translate('errors.user.not_found', {
          lang: acceptLanguage,
        }),
      });
    }

    // Upload new avatar
    const uploadResult = await this.cloudinaryService.uploadAvatar(
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
            this.logger.debug(`Old avatar deleted for user ${userId}`);
          } catch (error) {
            this.logger.error(
              `Failed to delete old avatar for user ${userId}: ${error.message}`,
              error.stack,
            );
          }
        } else {
          this.logger.debug(
            `Skipping cleanup of non-Cloudinary avatar for user ${userId}`,
          );
        }
      }

      this.logger.log(`Avatar updated successfully for user ${userId}`);
      return updatedUser;
    } catch (error) {
      // If the update fails, try to clean up the newly uploaded image
      try {
        await this.cloudinaryService.deleteImage(
          uploadResult.publicId,
          acceptLanguage,
        );
        this.logger.debug(
          `Cleaned up uploaded image after error for user ${userId}`,
        );
      } catch (cleanupError) {
        this.logger.error(
          `Failed to clean up uploaded image after error for user ${userId}: ${cleanupError.message}`,
          cleanupError.stack,
        );
      }
      this.logger.error(
        `Failed to update avatar for user ${userId}: ${error.message}`,
        error.stack,
      );
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
      this.logger.warn(`User not found for name update: ${userId}`);
      throw new NotFoundException({
        status: 404,
        code: 'USER.NOT_FOUND',
        message: this.i18n.translate('errors.user.not_found', {
          lang: acceptLanguage,
        }),
      });
    }

    this.logger.debug(
      `Updating name for user ${userId} from "${user.name}" to "${updateNameDto.name}"`,
    );
    await this.update(userId, { name: updateNameDto.name });
    const updatedUser = await this.findOne(userId);
    this.logger.log(`Name updated successfully for user ${userId}`);
    return updatedUser;
  }

  async deleteExpiredUnconfirmedAccounts(
    expirationDate: Date,
  ): Promise<number> {
    this.logger.debug(
      `Deleting expired unconfirmed accounts before ${expirationDate}`,
    );

    const result = await this.usersRepository.delete({
      isEmailConfirmed: false,
      emailConfirmationExpires: LessThan(expirationDate),
    });

    this.logger.log(`Deleted ${result.affected} expired unconfirmed accounts`);
    return result.affected || 0;
  }
}
