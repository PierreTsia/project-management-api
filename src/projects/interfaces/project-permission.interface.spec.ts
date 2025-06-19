import { IProjectPermissionService } from './project-permission.interface';
import { ProjectRole } from '../enums/project-role.enum';

describe('IProjectPermissionService', () => {
  it('should define hasProjectPermission method with correct signature', () => {
    // This test verifies the interface method signature
    const mockService: IProjectPermissionService = {
      hasProjectPermission: async (
        _userId: string,
        _projectId: string,
        _requiredRole: ProjectRole,
      ): Promise<boolean> => {
        return false;
      },
      getUserProjectRole: async (
        _userId: string,
        _projectId: string,
      ): Promise<ProjectRole | null> => {
        return null;
      },
    };

    expect(typeof mockService.hasProjectPermission).toBe('function');
    expect(typeof mockService.getUserProjectRole).toBe('function');
  });

  it('should define getUserProjectRole method with correct signature', () => {
    const mockService: IProjectPermissionService = {
      hasProjectPermission: async () => false,
      getUserProjectRole: async () => null,
    };

    expect(mockService.getUserProjectRole).toBeDefined();
  });

  it('should accept ProjectRole enum values', () => {
    const mockService: IProjectPermissionService = {
      hasProjectPermission: async () => false,
      getUserProjectRole: async () => null,
    };

    // Test that the interface accepts all ProjectRole values
    expect(async () => {
      await mockService.hasProjectPermission(
        'user1',
        'project1',
        ProjectRole.OWNER,
      );
      await mockService.hasProjectPermission(
        'user1',
        'project1',
        ProjectRole.ADMIN,
      );
      await mockService.hasProjectPermission(
        'user1',
        'project1',
        ProjectRole.WRITE,
      );
      await mockService.hasProjectPermission(
        'user1',
        'project1',
        ProjectRole.READ,
      );
    }).not.toThrow();
  });

  it('should return correct types', async () => {
    const mockService: IProjectPermissionService = {
      hasProjectPermission: async () => true,
      getUserProjectRole: async () => ProjectRole.OWNER,
    };

    const hasPermission = await mockService.hasProjectPermission(
      'user1',
      'project1',
      ProjectRole.READ,
    );
    const userRole = await mockService.getUserProjectRole('user1', 'project1');

    expect(typeof hasPermission).toBe('boolean');
    expect(userRole).toBe(ProjectRole.OWNER);
  });
});
