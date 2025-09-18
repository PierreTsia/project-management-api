import { Test, TestingModule } from '@nestjs/testing';
import { ContributorsService } from './contributors.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Project } from './projects/entities/project.entity';
import { ProjectContributor } from './projects/entities/project-contributor.entity';
import { Repository } from 'typeorm';
import { CustomLogger } from './common/services/logger.service';

describe('ContributorsService', () => {
  let service: ContributorsService;
  let contributorRepo: Repository<ProjectContributor>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContributorsService,
        { provide: getRepositoryToken(Project), useValue: {} },
        {
          provide: getRepositoryToken(ProjectContributor),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              addSelect: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
              getRawMany: jest.fn().mockResolvedValue([]),
            }),
          },
        },
        { provide: CustomLogger, useValue: { debug: jest.fn() } },
      ],
    }).compile();

    service = module.get<ContributorsService>(ContributorsService);
    contributorRepo = module.get<Repository<ProjectContributor>>(
      getRepositoryToken(ProjectContributor),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('listContributors returns empty paginated result when no projects', async () => {
    const qbViewer = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValueOnce([]),
    } as any;
    (contributorRepo.createQueryBuilder as jest.Mock).mockReturnValueOnce(
      qbViewer,
    );

    const result = await service.listContributors('viewer-1', {
      page: '1',
      pageSize: '10',
    });
    expect(result).toEqual({ contributors: [], total: 0, page: 1, limit: 10 });
  });

  it('listContributorProjects returns empty when no intersection', async () => {
    const qbViewer = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValueOnce([]),
    } as any;
    (contributorRepo.createQueryBuilder as jest.Mock).mockReturnValueOnce(
      qbViewer,
    );

    const result = await service.listContributorProjects(
      'target-1',
      'viewer-1',
    );
    expect(result).toEqual([]);
  });
});
