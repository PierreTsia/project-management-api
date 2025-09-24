import { Test, TestingModule } from '@nestjs/testing';
import { TaskGeneratorTool } from './task-generator.tool';
import { LlmProviderService } from '../llm-provider.service';
import { ContextService } from '../context/context.service';
import { AiRedactionService } from '../ai.redaction.service';
import { AiTracingService } from '../ai.tracing.service';
import { GenerateTasksRequestDto } from '../dto/generate-tasks.dto';
import { CustomLogger } from '../../common/services/logger.service';

describe('TaskGeneratorTool', () => {
  let tool: TaskGeneratorTool;
  let llmProvider: jest.Mocked<LlmProviderService>;
  let contextService: jest.Mocked<ContextService>;
  let redaction: jest.Mocked<AiRedactionService>;
  let tracing: jest.Mocked<AiTracingService>;

  beforeEach(async () => {
    const mockLlmProvider = {
      getInfo: jest.fn(),
      callLLM: jest.fn(),
    };
    const mockContextService = {
      getProject: jest.fn(),
      getTasks: jest.fn(),
    };
    const mockRedaction = {
      redactProject: jest.fn(),
      sanitizeText: jest.fn((s: string) => s),
    };
    const mockTracing = {
      withSpan: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskGeneratorTool,
        { provide: LlmProviderService, useValue: mockLlmProvider },
        { provide: ContextService, useValue: mockContextService },
        { provide: AiRedactionService, useValue: mockRedaction },
        { provide: AiTracingService, useValue: mockTracing },
        {
          provide: CustomLogger,
          useValue: {
            setContext: jest.fn(),
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
          },
        },
      ],
    }).compile();

    tool = module.get<TaskGeneratorTool>(TaskGeneratorTool);
    llmProvider = module.get(LlmProviderService);
    contextService = module.get(ContextService);
    redaction = module.get(AiRedactionService);
    tracing = module.get(AiTracingService);
  });

  it('should be defined', () => {
    expect(tool).toBeDefined();
  });

  describe('generateTasks', () => {
    const mockRequest: GenerateTasksRequestDto = {
      prompt: 'Create a user authentication system',
    };

    beforeEach(() => {
      llmProvider.getInfo.mockReturnValue({
        provider: 'mistral',
        model: 'mistral-small',
      });
      tracing.withSpan.mockImplementation(async (name, fn) => fn());
    });

    it('should generate tasks successfully', async () => {
      const mockResponse = JSON.stringify({
        tasks: [
          {
            title: 'Design auth flow',
            description: 'Create user flow diagrams',
            priority: 'HIGH',
          },
          {
            title: 'Implement login',
            description: 'Build login endpoint',
            priority: 'HIGH',
          },
          {
            title: 'Add password hashing',
            description: 'Implement secure password storage',
            priority: 'MEDIUM',
          },
        ],
      });

      llmProvider.callLLM.mockResolvedValue(mockResponse);

      const result = await tool.generateTasks(mockRequest);

      expect(result.tasks).toHaveLength(3);
      expect(result.tasks[0].title).toBe('Design auth flow');
      expect(result.meta.provider).toBe('mistral');
      expect(result.meta.degraded).toBe(false);
    });

    it('should handle project context when projectId provided', async () => {
      const requestWithProject: GenerateTasksRequestDto = {
        prompt: 'Add new features',
        projectId: 'project-123',
      };

      const mockProject = {
        id: 'project-123',
        name: 'Test Project',
        description: 'A test project',
      };
      const mockTasks = [
        {
          id: 'task-1',
          title: 'Existing task 1',
          description: 'First existing task',
          status: 'IN_PROGRESS' as any,
          priority: 'HIGH' as any,
          projectId: 'project-123',
          projectName: 'Test Project',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'task-2',
          title: 'Existing task 2',
          description: 'Second existing task',
          status: 'TODO' as any,
          priority: 'MEDIUM' as any,
          projectId: 'project-123',
          projectName: 'Test Project',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      contextService.getProject.mockResolvedValue(mockProject);
      contextService.getTasks.mockResolvedValue(mockTasks);
      redaction.redactProject.mockReturnValue({
        id: 'project-123',
        name: 'Test Project',
      });

      const mockResponse = JSON.stringify({
        tasks: [
          { title: 'New feature 1', priority: 'HIGH' },
          { title: 'New feature 2', priority: 'MEDIUM' },
          { title: 'New feature 3', priority: 'LOW' },
        ],
      });

      llmProvider.callLLM.mockResolvedValue(mockResponse);

      const result = await tool.generateTasks(requestWithProject, 'u1');

      expect(contextService.getProject).toHaveBeenCalledWith(
        'project-123',
        'u1',
      );
      expect(contextService.getTasks).toHaveBeenCalledWith('project-123');
      expect(redaction.redactProject).toHaveBeenCalledWith(mockProject);
      expect(result.meta.degraded).toBe(false);
    });

    it('should handle context errors gracefully', async () => {
      const requestWithProject: GenerateTasksRequestDto = {
        prompt: 'Add new features',
        projectId: 'project-123',
      };

      contextService.getProject.mockRejectedValue(
        new Error('Project not found'),
      );

      const mockResponse = JSON.stringify({
        tasks: [
          { title: 'New feature 1', priority: 'HIGH' },
          { title: 'New feature 2', priority: 'MEDIUM' },
          { title: 'New feature 3', priority: 'LOW' },
        ],
      });

      llmProvider.callLLM.mockResolvedValue(mockResponse);

      const result = await tool.generateTasks(requestWithProject, 'u1');

      expect(result.meta.degraded).toBe(true);
    });

    it('should fallback to default tasks on JSON parsing error', async () => {
      llmProvider.callLLM.mockResolvedValue('invalid json');

      const result = await tool.generateTasks(mockRequest);

      expect(result.tasks).toHaveLength(3);
      expect(result.tasks[0].title).toBe('Analyze requirements');
      expect(result.meta.degraded).toBe(true);
    });

    it('should enforce task count limits', async () => {
      const tooManyTasks = JSON.stringify({
        tasks: Array(15)
          .fill(0)
          .map((_, i) => ({
            title: `Task ${i + 1}`,
            priority: 'MEDIUM',
          })),
      });

      llmProvider.callLLM.mockResolvedValue(tooManyTasks);

      const result = await tool.generateTasks(mockRequest);

      // Should fallback to default tasks due to validation failure
      expect(result.tasks).toHaveLength(3);
      expect(result.meta.degraded).toBe(true);
    });
  });
});
