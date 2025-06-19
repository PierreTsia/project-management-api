import { ProjectRole } from './project-role.enum';

describe('ProjectRole', () => {
  it('should have the correct enum values', () => {
    expect(ProjectRole.OWNER).toBe('OWNER');
    expect(ProjectRole.ADMIN).toBe('ADMIN');
    expect(ProjectRole.WRITE).toBe('WRITE');
    expect(ProjectRole.READ).toBe('READ');
  });

  it('should have exactly 4 roles', () => {
    const roles = Object.values(ProjectRole);
    expect(roles).toHaveLength(4);
  });

  it('should have unique values', () => {
    const roles = Object.values(ProjectRole);
    const uniqueRoles = [...new Set(roles)];
    expect(uniqueRoles).toHaveLength(4);
  });

  it('should follow the correct hierarchy order', () => {
    const roles = Object.values(ProjectRole);
    expect(roles[0]).toBe('OWNER'); // Highest permission
    expect(roles[1]).toBe('ADMIN');
    expect(roles[2]).toBe('WRITE');
    expect(roles[3]).toBe('READ'); // Lowest permission
  });
});
