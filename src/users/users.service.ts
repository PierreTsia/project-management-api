import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { MoreThan } from 'typeorm';
import { UpdateNameDto } from './dto/update-name.dto';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly i18n: I18nService,
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
    _userId: string,
    _file: any,
    _acceptLanguage: string,
  ): Promise<Partial<User>> {
    // To be implemented
    return {};
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
