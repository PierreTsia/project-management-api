import { validate } from 'class-validator';
import { UpdateUserProfileDto } from './update-user-profile.dto';

describe('UpdateUserProfileDto validation', () => {
  it('accepts valid E.164 phone and ISO dob', async () => {
    const dto = new UpdateUserProfileDto();
    dto.name = 'John Doe';
    dto.phone = '+15551234567';
    dto.dob = '1990-05-20';
    dto.bio = 'Hello';

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects too-short phone like +33', async () => {
    const dto = new UpdateUserProfileDto();
    dto.name = 'John Doe';
    dto.phone = '+33';

    const errors = await validate(dto);
    const phoneError = errors.find((e) => e.property === 'phone');
    expect(phoneError).toBeTruthy();
  });

  it('rejects invalid dob format', async () => {
    const dto = new UpdateUserProfileDto();
    dto.name = 'John Doe';
    dto.dob = '20-05-1990';

    const errors = await validate(dto);
    const dobError = errors.find((e) => e.property === 'dob');
    expect(dobError).toBeTruthy();
  });

  it('rejects too long bio', async () => {
    const dto = new UpdateUserProfileDto();
    dto.name = 'John Doe';
    dto.bio = 'a'.repeat(281);

    const errors = await validate(dto);
    const bioError = errors.find((e) => e.property === 'bio');
    expect(bioError).toBeTruthy();
  });
});
