import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsContextAdapter } from './projects-context.adapter';
import { ProjectsService } from '../../../projects/projects.service';
import {
  Project,
  ProjectStatus,
} from '../../../projects/entities/project.entity';
import { User } from '../../../users/entities/user.entity';

function makeProject(): Project {
  const owner = Object.assign(new User(), {
    id: 'u1',
    email: 'u1@example.com',
  });
  return Object.assign(new Project(), {
    id: 'p1',
    name: 'Project 1',
    status: ProjectStatus.ACTIVE,
    ownerId: owner.id,
    owner,
    contributors: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe('ProjectsContextAdapter', () => {
  let adapter: ProjectsContextAdapter;
  let projectsService: jest.Mocked<ProjectsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsContextAdapter,
        {
          provide: ProjectsService,
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    adapter = module.get<ProjectsContextAdapter>(ProjectsContextAdapter);
    projectsService = module.get(ProjectsService);
  });

  it('returns minimal project context when found', async () => {
    projectsService.findOne.mockResolvedValue(makeProject());

    const res = await adapter.getProject('p1', 'u1');

    expect(res).toEqual({ id: 'p1', name: 'Project 1', description: '' });
    expect(projectsService.findOne).toHaveBeenCalledWith('p1', 'u1');
  });

  it('returns undefined when not found (error path)', async () => {
    projectsService.findOne.mockRejectedValue(new Error('not found'));

    const res = await adapter.getProject('p1', 'u1');

    expect(res).toBeUndefined();
  });
});
