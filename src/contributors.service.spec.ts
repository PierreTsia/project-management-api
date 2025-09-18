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
              leftJoin: jest.fn().mockReturnThis(),
              addSelect: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              distinct: jest.fn().mockReturnThis(),
              getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
              getRawMany: jest.fn().mockResolvedValue([]),
              getMany: jest.fn().mockResolvedValue([]),
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

  it('applies text search and role filters, orders by name asc', async () => {
    const qbViewer = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValueOnce([{ projectId: 'p1' }]),
    } as any;
    const qbUserIds = {
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      distinct: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValueOnce([{ userId: 'u1' }]),
    } as any;
    const qbContrib = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValueOnce([]),
    } as any;
    (contributorRepo.createQueryBuilder as jest.Mock)
      .mockReturnValueOnce(qbViewer)
      .mockReturnValueOnce(qbUserIds)
      .mockReturnValueOnce(qbContrib);

    await service.listContributors('viewer-1', {
      q: 'john',
      role: 'READ' as any,
      page: '1',
      pageSize: '10',
      sort: 'name',
      order: 'asc',
    });

    expect(qbUserIds.andWhere).toHaveBeenCalledWith('pc.role = :role', {
      role: 'READ',
    });
    expect(qbUserIds.andWhere).toHaveBeenCalledWith(
      '(user.name ILIKE :q OR user.email ILIKE :q)',
      { q: '%john%' },
    );
    expect(qbUserIds.orderBy).toHaveBeenCalledWith('user.name', 'ASC');
  });

  it('sorts by projectsCount desc post-aggregation', async () => {
    const qbViewer = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValueOnce([{ projectId: 'p1' }]),
    } as any;
    const rows = [
      // u1 appears twice (projectsCount 2)
      {
        user: { id: 'u1', name: 'A', email: 'a@example.com' },
        project: { id: 'p1', name: 'P1' },
        role: 'READ',
      },
      {
        user: { id: 'u1', name: 'A', email: 'a@example.com' },
        project: { id: 'p2', name: 'P2' },
        role: 'WRITE',
      },
      // u2 appears once (projectsCount 1)
      {
        user: { id: 'u2', name: 'B', email: 'b@example.com' },
        project: { id: 'p3', name: 'P3' },
        role: 'READ',
      },
    ] as any[];
    const qbUserIds = {
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      distinct: jest.fn().mockReturnThis(),
      getRawMany: jest
        .fn()
        .mockResolvedValueOnce([{ userId: 'u1' }, { userId: 'u2' }]),
    } as any;
    const qbContrib = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValueOnce(rows),
    } as any;
    (contributorRepo.createQueryBuilder as jest.Mock)
      .mockReturnValueOnce(qbViewer)
      .mockReturnValueOnce(qbUserIds)
      .mockReturnValueOnce(qbContrib);

    const result = await service.listContributors('viewer-1', {
      page: '1',
      pageSize: '10',
      sort: 'projectsCount',
      order: 'desc',
    });

    expect(result.contributors).toHaveLength(2);
    expect(result.contributors[0].user.id).toBe('u1');
    expect(result.contributors[1].user.id).toBe('u2');
  });

  it('applies projectId filter and sorts by joinedAt desc', async () => {
    const qbViewer = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValueOnce([{ projectId: 'p1' }]),
    } as any;
    const qbUserIds = {
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      distinct: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValueOnce([{ userId: 'u1' }]),
    } as any;
    const qbContrib = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValueOnce([]),
    } as any;
    (contributorRepo.createQueryBuilder as jest.Mock)
      .mockReturnValueOnce(qbViewer)
      .mockReturnValueOnce(qbUserIds)
      .mockReturnValueOnce(qbContrib);

    await service.listContributors('viewer-1', {
      projectId: 'p1',
      page: '1',
      pageSize: '10',
      sort: 'joinedAt',
      order: 'desc',
    });

    expect(qbUserIds.andWhere).toHaveBeenCalledWith(
      'pc.projectId = :projectId',
      { projectId: 'p1' },
    );
    expect(qbUserIds.orderBy).toHaveBeenCalledWith('pc.joinedAt', 'DESC');
  });

  it('returns empty contributors when pagination slice is outside range', async () => {
    const qbViewer = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValueOnce([{ projectId: 'p1' }]),
    } as any;
    const qbUserIds = {
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      distinct: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValueOnce([{ userId: 'u1' }]),
    } as any;
    (contributorRepo.createQueryBuilder as jest.Mock)
      .mockReturnValueOnce(qbViewer)
      .mockReturnValueOnce(qbUserIds);

    const result = await service.listContributors('viewer-1', {
      page: '2',
      pageSize: '1',
      sort: 'name',
      order: 'asc',
    });

    expect(result).toEqual({ contributors: [], total: 1, page: 2, limit: 1 });
  });

  it('aggregates roles without duplicates and counts projects per user', async () => {
    const qbViewer = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValueOnce([{ projectId: 'p1' }]),
    } as any;
    const qbUserIds = {
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      distinct: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValueOnce([{ userId: 'u1' }]),
    } as any;
    const rows = [
      {
        user: { id: 'u1', name: 'A', email: 'a@example.com' },
        project: { id: 'p1', name: 'P1' },
        role: 'READ',
      },
      {
        user: { id: 'u1', name: 'A', email: 'a@example.com' },
        project: { id: 'p2', name: 'P2' },
        role: 'READ',
      },
      {
        user: { id: 'u1', name: 'A', email: 'a@example.com' },
        project: { id: 'p3', name: 'P3' },
        role: 'WRITE',
      },
    ] as any[];
    const qbContrib = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValueOnce(rows),
    } as any;
    (contributorRepo.createQueryBuilder as jest.Mock)
      .mockReturnValueOnce(qbViewer)
      .mockReturnValueOnce(qbUserIds)
      .mockReturnValueOnce(qbContrib);

    const result = await service.listContributors('viewer-1', {
      page: '1',
      pageSize: '10',
      sort: 'name',
      order: 'asc',
    });

    expect(result.contributors).toHaveLength(1);
    expect(result.contributors[0].projectsCount).toBe(3);
    expect(result.contributors[0].roles.sort()).toEqual(['READ', 'WRITE']);
  });
});
