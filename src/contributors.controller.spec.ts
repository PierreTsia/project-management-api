import { Test, TestingModule } from '@nestjs/testing';
import { ContributorsController } from './contributors.controller';
import { ContributorsService } from './contributors.service';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

describe('ContributorsController', () => {
  let controller: ContributorsController;
  let service: ContributorsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContributorsController],
      providers: [
        {
          provide: ContributorsService,
          useValue: {
            listContributors: jest.fn(),
            listContributorProjects: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ContributorsController>(ContributorsController);
    service = module.get<ContributorsService>(ContributorsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('list', () => {
    it('should return contributors with pagination meta', async () => {
      const req = { user: { id: 'viewer-1' } } as any;
      const query = { q: 'john', page: '1', pageSize: '10' } as any;
      const resp = { contributors: [], total: 0, page: 1, limit: 10 };
      (service.listContributors as jest.Mock).mockResolvedValue(resp);

      const result = await controller.list(req, query);

      expect(service.listContributors).toHaveBeenCalledWith(
        'viewer-1',
        query,
        undefined,
      );
      expect(result).toEqual(resp);
    });
  });

  describe('listProjects', () => {
    it('should return shared projects for user', async () => {
      const req = { user: { id: 'viewer-1' } } as any;
      const userId = 'target-1';
      const projects = [{ projectId: 'p1', name: 'P1', role: 'READ' }];
      (service.listContributorProjects as jest.Mock).mockResolvedValue(
        projects,
      );

      const result = await controller.listProjects(userId, req);

      expect(service.listContributorProjects).toHaveBeenCalledWith(
        userId,
        'viewer-1',
        undefined,
      );
      expect(result).toEqual(projects);
    });
  });
});
