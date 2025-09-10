# Dashboard API Battle Plan

## 🎯 Overview

This document outlines the complete implementation plan for a Dashboard API that provides users with a centralized view of their tasks, projects, and related statistics. The dashboard will respect existing role-based permissions and maintain clean architecture principles.

## 📊 Current Architecture Analysis

### Entities & Relationships
- **User** → **Project** (owner relationship)
- **Project** → **Task** (one-to-many)
- **User** → **Task** (assignee relationship, nullable)
- **ProjectContributor** (many-to-many with roles: OWNER, ADMIN, WRITE, READ)

### Existing Patterns
- ✅ Clean modular architecture with proper DI
- ✅ Role-based permissions with guards
- ✅ Consistent DTO patterns with validation
- ✅ Proper error handling with i18n
- ✅ Existing `ReportingModule` for extension

## 🚀 Dashboard API Design

### New Endpoints
```
GET /dashboard/summary          - Overall dashboard statistics
GET /dashboard/my-tasks         - User's assigned tasks across all projects (with filtering)
GET /dashboard/my-projects      - User's accessible projects
```

**Note:** Project-specific tasks are already available via existing `GET /projects/:projectId/tasks` endpoint.

### Dashboard Summary Endpoint Explained

The `GET /dashboard/summary` endpoint provides a comprehensive overview of the user's work status across all their accessible projects. Think of it as the "executive dashboard" that gives users instant insights into:

#### 📊 **Project Statistics**
- **Total Projects**: How many projects the user has access to
- **Active Projects**: Currently active projects (not archived)
- **Archived Projects**: Completed or archived projects

#### 📋 **Task Statistics**
- **Total Tasks**: All tasks across all accessible projects
- **Assigned Tasks**: Tasks specifically assigned to the user
- **Completed Tasks**: Tasks marked as DONE
- **Overdue Tasks**: Tasks past their due date (not completed)
- **Tasks by Status**: Breakdown by TODO, IN_PROGRESS, DONE
- **Tasks by Priority**: Breakdown by LOW, MEDIUM, HIGH

#### 📈 **Calculated Metrics**
- **Completion Rate**: Percentage of completed vs total tasks
- **Average Tasks per Project**: Workload distribution across projects

#### 🔄 **Recent Activity**
- Recent task updates, assignments, project changes
- Timeline of user's recent actions

#### 💡 **Use Cases**
- **Quick Status Check**: "How am I doing overall?"
- **Workload Assessment**: "Am I overloaded with tasks?"
- **Progress Tracking**: "What's my completion rate?"
- **Priority Management**: "Do I have too many high-priority tasks?"
- **Project Health**: "Are my projects active or mostly archived?"

### Key Features
- **Role-aware data filtering** - users only see what they have access to
- **Task filtering by assignee** - with proper project permission checks
- **Dashboard statistics** - task counts, project summaries, etc.
- **Clean separation** - no circular dependencies, proper DI

## 📋 Implementation Steps

### Phase 1: Foundation Setup

#### Step 1.1: Create Dashboard DTOs
**Files to create:**
- `src/dashboard/dto/dashboard-summary.dto.ts`
- `src/dashboard/dto/dashboard-task.dto.ts`
- `src/dashboard/dto/dashboard-project.dto.ts`
- `src/dashboard/dto/dashboard-query.dto.ts`

**Key DTOs:**
```typescript
// DashboardSummaryDto
export class DashboardSummaryDto {
  // Project Statistics
  totalProjects: number;
  activeProjects: number;
  archivedProjects: number;
  
  // Task Statistics
  totalTasks: number;
  assignedTasks: number;
  completedTasks: number;
  overdueTasks: number;
  tasksByStatus: {
    todo: number;
    inProgress: number;
    done: number;
  };
  tasksByPriority: {
    low: number;
    medium: number;
    high: number;
  };
  
  // Recent Activity
  recentActivity: ActivityItem[];
  
  // Quick Stats
  completionRate: number; // percentage of completed tasks
  averageTasksPerProject: number;
}

// DashboardTaskDto
export class DashboardTaskDto {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  project: {
    id: string;
    name: string;
  };
  assignee?: {
    id: string;
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

#### Step 1.2: Create Dashboard Service
**File:** `src/dashboard/services/dashboard.service.ts`

**Key Methods:**
- `getDashboardSummary(userId: string): Promise<DashboardSummaryDto>`
- `getUserTasks(userId: string, query: DashboardQueryDto): Promise<DashboardTaskDto[]>`
- `getUserProjects(userId: string): Promise<DashboardProjectDto[]>`

#### Step 1.3: Create Dashboard Controller
**File:** `src/dashboard/controllers/dashboard.controller.ts`

**Endpoints:**
- `GET /dashboard/summary`
- `GET /dashboard/my-tasks`
- `GET /dashboard/my-projects`

### Phase 2: Core Implementation

#### Step 2.1: Implement Dashboard Service Logic

**Key Implementation Details:**
- Inject `ProjectsService` and `TasksService`
- Use existing permission checks
- Aggregate data efficiently with single queries where possible
- Handle pagination and filtering

**Example Service Method:**
```typescript
async getDashboardSummary(userId: string): Promise<DashboardSummaryDto> {
  // Get user's accessible projects
  const projects = await this.projectsService.findAll(userId);
  const projectIds = projects.map(p => p.id);
  
  // Get task statistics
  const taskStats = await this.taskRepository
    .createQueryBuilder('task')
    .select([
      'COUNT(*) as total',
      'COUNT(CASE WHEN task.assigneeId = :userId THEN 1 END) as assigned',
      'COUNT(CASE WHEN task.status = :doneStatus THEN 1 END) as completed',
      'COUNT(CASE WHEN task.dueDate < NOW() AND task.status != :doneStatus THEN 1 END) as overdue'
    ])
    .where('task.projectId IN (:...projectIds)', { projectIds })
    .setParameters({ userId, doneStatus: TaskStatus.DONE })
    .getRawOne();
    
  return {
    totalProjects: projects.length,
    totalTasks: parseInt(taskStats.total),
    assignedTasks: parseInt(taskStats.assigned),
    completedTasks: parseInt(taskStats.completed),
    overdueTasks: parseInt(taskStats.overdue),
    recentActivity: await this.getRecentActivity(userId)
  };
}
```

#### Step 2.2: Implement Controller Endpoints

**Controller Structure:**
```typescript
@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get dashboard summary statistics' })
  async getSummary(@Request() req: { user: User }): Promise<DashboardSummaryDto> {
    return this.dashboardService.getDashboardSummary(req.user.id);
  }

  @Get('my-tasks')
  @ApiOperation({ summary: 'Get user assigned tasks across all projects' })
  async getMyTasks(
    @Request() req: { user: User },
    @Query() query: DashboardQueryDto
  ): Promise<DashboardTaskDto[]> {
    return this.dashboardService.getUserTasks(req.user.id, query);
  }

  @Get('my-projects')
  @ApiOperation({ summary: 'Get user accessible projects' })
  async getMyProjects(
    @Request() req: { user: User }
  ): Promise<DashboardProjectDto[]> {
    return this.dashboardService.getUserProjects(req.user.id);
  }

  // ... other endpoints
}
```

### Phase 3: Dashboard Module Setup

#### Step 3.1: Create Dashboard Module
**File:** `src/dashboard/dashboard.module.ts`

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([Task, Project, ProjectContributor]),
    ProjectsModule,
    TasksModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
```

#### Step 3.2: Update App Module
**File:** `src/app.module.ts`

Add `DashboardModule` to imports array.

### Phase 4: Testing Implementation

#### Step 4.1: Unit Tests

**Files to create:**
- `src/dashboard/services/dashboard.service.spec.ts`
- `src/dashboard/controllers/dashboard.controller.spec.ts`

**Test Coverage:**
- Dashboard service methods
- Controller endpoints
- Error handling
- Permission checks
- Data aggregation logic

#### Step 4.2: Integration Tests

**File:** `test/dashboard.e2e-spec.ts`

**Test Scenarios:**
- Authenticated user can access dashboard
- Unauthenticated user gets 401
- User only sees their accessible data
- Pagination works correctly
- Filtering works correctly

#### Step 4.3: Test Data Setup

**Test Fixtures:**
- Create test users with different roles
- Create test projects with contributors
- Create test tasks with different assignees
- Set up test database with known data

### Phase 5: Swagger Documentation

#### Step 5.1: Add Swagger Decorators to Controller

**File:** `src/dashboard/controllers/dashboard.controller.ts`

**Required Swagger Decorators:**
```typescript
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiProperty,
} from '@nestjs/swagger';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller('dashboard')
export class DashboardController {
  @Get('summary')
  @ApiOperation({ 
    summary: 'Get dashboard summary statistics',
    description: 'Returns comprehensive overview of user\'s projects, tasks, and progress metrics across all accessible projects.'
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard summary retrieved successfully',
    type: DashboardSummaryDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getSummary(@Request() req: { user: User }): Promise<DashboardSummaryDto> {
    return this.dashboardService.getDashboardSummary(req.user.id);
  }

  @Get('my-tasks')
  @ApiOperation({ 
    summary: 'Get user assigned tasks across all projects',
    description: 'Returns all tasks assigned to the current user across all projects they have access to, with optional filtering and pagination.'
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: TaskStatus,
    description: 'Filter tasks by status',
  })
  @ApiQuery({
    name: 'priority',
    required: false,
    enum: TaskPriority,
    description: 'Filter tasks by priority',
  })
  @ApiQuery({
    name: 'projectId',
    required: false,
    type: String,
    description: 'Filter tasks by specific project ID',
  })
  @ApiQuery({
    name: 'dueDateFrom',
    required: false,
    type: String,
    format: 'date',
    description: 'Filter tasks due after this date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'dueDateTo',
    required: false,
    type: String,
    format: 'date',
    description: 'Filter tasks due before this date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 20, max: 100)',
  })
  @ApiResponse({
    status: 200,
    description: 'User tasks retrieved successfully',
    type: [DashboardTaskDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid query parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token',
  })
  async getMyTasks(
    @Request() req: { user: User },
    @Query() query: DashboardQueryDto
  ): Promise<DashboardTaskDto[]> {
    return this.dashboardService.getUserTasks(req.user.id, query);
  }

  @Get('my-projects')
  @ApiOperation({ 
    summary: 'Get user accessible projects',
    description: 'Returns all projects the current user has access to, including projects they own and projects they contribute to.'
  })
  @ApiResponse({
    status: 200,
    description: 'User projects retrieved successfully',
    type: [DashboardProjectDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token',
  })
  async getMyProjects(
    @Request() req: { user: User }
  ): Promise<DashboardProjectDto[]> {
    return this.dashboardService.getUserProjects(req.user.id);
  }
}
```

#### Step 5.2: Add Swagger Decorators to DTOs

**File:** `src/dashboard/dto/dashboard-summary.dto.ts`
```typescript
import { ApiProperty } from '@nestjs/swagger';

export class DashboardSummaryDto {
  @ApiProperty({
    description: 'Total number of projects user has access to',
    example: 5,
  })
  totalProjects: number;

  @ApiProperty({
    description: 'Number of active (non-archived) projects',
    example: 4,
  })
  activeProjects: number;

  @ApiProperty({
    description: 'Number of archived projects',
    example: 1,
  })
  archivedProjects: number;

  @ApiProperty({
    description: 'Total number of tasks across all accessible projects',
    example: 23,
  })
  totalTasks: number;

  @ApiProperty({
    description: 'Number of tasks assigned to the current user',
    example: 8,
  })
  assignedTasks: number;

  @ApiProperty({
    description: 'Number of completed tasks',
    example: 15,
  })
  completedTasks: number;

  @ApiProperty({
    description: 'Number of overdue tasks (past due date and not completed)',
    example: 2,
  })
  overdueTasks: number;

  @ApiProperty({
    description: 'Task breakdown by status',
    type: 'object',
    properties: {
      todo: { type: 'number', example: 6 },
      inProgress: { type: 'number', example: 2 },
      done: { type: 'number', example: 15 },
    },
  })
  tasksByStatus: {
    todo: number;
    inProgress: number;
    done: number;
  };

  @ApiProperty({
    description: 'Task breakdown by priority',
    type: 'object',
    properties: {
      low: { type: 'number', example: 3 },
      medium: { type: 'number', example: 12 },
      high: { type: 'number', example: 8 },
    },
  })
  tasksByPriority: {
    low: number;
    medium: number;
    high: number;
  };

  @ApiProperty({
    description: 'Task completion rate as percentage',
    example: 65.2,
  })
  completionRate: number;

  @ApiProperty({
    description: 'Average number of tasks per project',
    example: 4.6,
  })
  averageTasksPerProject: number;

  @ApiProperty({
    description: 'Recent activity timeline',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        type: { type: 'string', example: 'task_completed' },
        description: { type: 'string', example: 'Completed "Fix login bug" in Project Alpha' },
        timestamp: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' },
      },
    },
  })
  recentActivity: ActivityItem[];
}
```

**File:** `src/dashboard/dto/dashboard-task.dto.ts`
```typescript
import { ApiProperty } from '@nestjs/swagger';
import { TaskStatus, TaskPriority } from '../../tasks/enums';

export class DashboardTaskDto {
  @ApiProperty({
    description: 'Unique task identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Task title',
    example: 'Fix authentication bug',
  })
  title: string;

  @ApiProperty({
    description: 'Task description',
    example: 'Fix the login issue where users cannot authenticate with OAuth',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'Current task status',
    enum: TaskStatus,
    example: TaskStatus.IN_PROGRESS,
  })
  status: TaskStatus;

  @ApiProperty({
    description: 'Task priority level',
    enum: TaskPriority,
    example: TaskPriority.HIGH,
  })
  priority: TaskPriority;

  @ApiProperty({
    description: 'Task due date',
    example: '2024-01-20T17:00:00Z',
    required: false,
  })
  dueDate?: Date;

  @ApiProperty({
    description: 'Project information',
    type: 'object',
    properties: {
      id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440001' },
      name: { type: 'string', example: 'Project Alpha' },
    },
  })
  project: {
    id: string;
    name: string;
  };

  @ApiProperty({
    description: 'Task assignee information',
    type: 'object',
    required: false,
    properties: {
      id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440002' },
      name: { type: 'string', example: 'John Doe' },
    },
  })
  assignee?: {
    id: string;
    name: string;
  };

  @ApiProperty({
    description: 'Task creation timestamp',
    example: '2024-01-10T09:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Task last update timestamp',
    example: '2024-01-15T14:30:00Z',
  })
  updatedAt: Date;
}
```

**File:** `src/dashboard/dto/dashboard-query.dto.ts`
```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString, IsDateString, IsNumber, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { TaskStatus } from '../../tasks/enums/task-status.enum';
import { TaskPriority } from '../../tasks/enums/task-priority.enum';

export class DashboardQueryDto {
  @ApiProperty({
    description: 'Filter tasks by status',
    enum: TaskStatus,
    required: false,
    example: TaskStatus.TODO,
  })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiProperty({
    description: 'Filter tasks by priority',
    enum: TaskPriority,
    required: false,
    example: TaskPriority.HIGH,
  })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiProperty({
    description: 'Filter tasks by specific project ID',
    required: false,
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiProperty({
    description: 'Filter tasks due after this date (YYYY-MM-DD)',
    required: false,
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  dueDateFrom?: string;

  @ApiProperty({
    description: 'Filter tasks due before this date (YYYY-MM-DD)',
    required: false,
    example: '2024-01-31',
  })
  @IsOptional()
  @IsDateString()
  dueDateTo?: string;

  @ApiProperty({
    description: 'Page number for pagination',
    required: false,
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    required: false,
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
```

#### Step 5.3: Add Swagger Examples and Error Responses

**File:** `src/dashboard/dto/dashboard-examples.ts`
```typescript
export const DASHBOARD_EXAMPLES = {
  summary: {
    value: {
      totalProjects: 5,
      activeProjects: 4,
      archivedProjects: 1,
      totalTasks: 23,
      assignedTasks: 8,
      completedTasks: 15,
      overdueTasks: 2,
      tasksByStatus: {
        todo: 6,
        inProgress: 2,
        done: 15,
      },
      tasksByPriority: {
        low: 3,
        medium: 12,
        high: 8,
      },
      completionRate: 65.2,
      averageTasksPerProject: 4.6,
      recentActivity: [
        {
          type: 'task_completed',
          description: 'Completed "Fix login bug" in Project Alpha',
          timestamp: '2024-01-15T10:30:00Z',
        },
        {
          type: 'task_assigned',
          description: 'Assigned "Update documentation" in Project Beta',
          timestamp: '2024-01-14T16:45:00Z',
        },
      ],
    },
  },
  task: {
    value: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Fix authentication bug',
      description: 'Fix the login issue where users cannot authenticate with OAuth',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueDate: '2024-01-20T17:00:00Z',
      project: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Project Alpha',
      },
      assignee: {
        id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'John Doe',
      },
      createdAt: '2024-01-10T09:00:00Z',
      updatedAt: '2024-01-15T14:30:00Z',
    },
  },
};
```

### Phase 6: Advanced Features

#### Step 6.1: Add Filtering and Pagination

**Query Parameters:**
- `status` - filter by task status
- `priority` - filter by task priority
- `projectId` - filter by specific project
- `dueDate` - filter by due date range
- `page` - pagination page
- `limit` - items per page

#### Step 5.2: Add Sorting Options

**Sort Options:**
- By due date (asc/desc)
- By priority (asc/desc)
- By created date (asc/desc)
- By project name (asc/desc)

#### Step 5.3: Add Dashboard Statistics

**Additional Stats:**
- Tasks completed this week/month
- Average task completion time
- Project progress percentages
- Team activity metrics

## 🧪 Testing Strategy

### Unit Tests

#### Dashboard Service Tests
```typescript
describe('DashboardService', () => {
  let service: DashboardService;
  let mockProjectsService: jest.Mocked<ProjectsService>;
  let mockTasksService: jest.Mocked<TasksService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: ProjectsService,
          useValue: createMockProjectsService(),
        },
        {
          provide: TasksService,
          useValue: createMockTasksService(),
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  describe('getDashboardSummary', () => {
    it('should return correct summary statistics', async () => {
      // Arrange
      const userId = 'user-1';
      const mockProjects = [createMockProject()];
      const mockTasks = [createMockTask()];
      
      mockProjectsService.findAll.mockResolvedValue(mockProjects);
      mockTasksService.findByUser.mockResolvedValue(mockTasks);

      // Act
      const result = await service.getDashboardSummary(userId);

      // Assert
      expect(result.totalProjects).toBe(1);
      expect(result.totalTasks).toBe(1);
      expect(mockProjectsService.findAll).toHaveBeenCalledWith(userId);
    });
  });
});
```

#### Dashboard Controller Tests
```typescript
describe('DashboardController', () => {
  let controller: DashboardController;
  let mockDashboardService: jest.Mocked<DashboardService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        {
          provide: DashboardService,
          useValue: createMockDashboardService(),
        },
      ],
    }).compile();

    controller = module.get<DashboardController>(DashboardController);
  });

  describe('GET /dashboard/summary', () => {
    it('should return dashboard summary', async () => {
      // Arrange
      const mockUser = { id: 'user-1' };
      const mockSummary = createMockDashboardSummary();
      mockDashboardService.getDashboardSummary.mockResolvedValue(mockSummary);

      // Act
      const result = await controller.getSummary({ user: mockUser });

      // Assert
      expect(result).toEqual(mockSummary);
      expect(mockDashboardService.getDashboardSummary).toHaveBeenCalledWith('user-1');
    });
  });
});
```

### Integration Tests

#### E2E Dashboard Tests
```typescript
describe('Dashboard (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let testUser: User;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Setup test user and auth token
    testUser = await createTestUser();
    authToken = await getAuthToken(testUser);
  });

  describe('GET /dashboard/summary', () => {
    it('should return dashboard summary for authenticated user', () => {
      return request(app.getHttpServer())
        .get('/dashboard/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('totalProjects');
          expect(res.body).toHaveProperty('totalTasks');
          expect(res.body).toHaveProperty('assignedTasks');
        });
    });

    it('should return 401 for unauthenticated user', () => {
      return request(app.getHttpServer())
        .get('/dashboard/summary')
        .expect(401);
    });
  });

  describe('GET /dashboard/my-tasks', () => {
    it('should return user assigned tasks', async () => {
      // Create test tasks
      await createTestTasksForUser(testUser.id);

      return request(app.getHttpServer())
        .get('/dashboard/my-tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('should support pagination', () => {
      return request(app.getHttpServer())
        .get('/dashboard/my-tasks?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('should support filtering by status', () => {
      return request(app.getHttpServer())
        .get('/dashboard/my-tasks?status=TODO')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });
});
```

### Test Data Factories

#### Mock Data Creators
```typescript
// test/factories/dashboard.factory.ts
export function createMockDashboardSummary(): DashboardSummaryDto {
  return {
    totalProjects: 3,
    totalTasks: 15,
    assignedTasks: 8,
    completedTasks: 5,
    overdueTasks: 2,
    recentActivity: [
      {
        type: 'task_created',
        description: 'New task created',
        timestamp: new Date(),
      },
    ],
  };
}

export function createMockDashboardTask(): DashboardTaskDto {
  return {
    id: 'task-1',
    title: 'Test Task',
    description: 'Test Description',
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    dueDate: new Date(),
    project: {
      id: 'project-1',
      name: 'Test Project',
    },
    assignee: {
      id: 'user-1',
      name: 'Test User',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
```

## 🔧 Implementation Checklist

### Phase 1: Foundation
- [ ] Create dashboard DTOs
- [ ] Create dashboard service interface
- [ ] Create dashboard controller skeleton
- [ ] Set up basic module structure

### Phase 2: Core Logic
- [ ] Implement dashboard summary logic
- [ ] Implement user tasks retrieval (across all projects)
- [ ] Implement user projects retrieval

### Phase 3: Module Integration
- [ ] Create dashboard module
- [ ] Update app module imports
- [ ] Configure TypeORM entities
- [ ] Set up dependency injection

### Phase 4: Testing
- [ ] Write unit tests for service
- [ ] Write unit tests for controller
- [ ] Write integration tests
- [ ] Set up test data factories
- [ ] Add E2E tests

### Phase 5: Swagger Documentation
- [ ] Add Swagger decorators to controller endpoints
- [ ] Add ApiProperty decorators to all DTOs
- [ ] Add query parameter documentation
- [ ] Add response examples
- [ ] Add error response documentation
- [ ] Test Swagger UI integration

### Phase 6: Advanced Features
- [ ] Add pagination support
- [ ] Add filtering options
- [ ] Add sorting capabilities
- [ ] Add additional statistics
- [ ] Performance optimization

## 🚀 Deployment Considerations

### Database Migrations
- No new tables required (using existing entities)
- May need indexes for performance on dashboard queries

### Performance Optimization
- Add database indexes for common dashboard queries
- Consider caching for dashboard summary data
- Implement query optimization for large datasets

### Monitoring
- Add logging for dashboard access patterns
- Monitor query performance
- Track user engagement with dashboard features

## 📚 Documentation

### API Documentation
- Swagger/OpenAPI documentation for all endpoints
- Example requests and responses
- Error code documentation

### User Documentation
- Dashboard feature overview
- Filtering and pagination guide
- Role-based access explanation

---

## 🎯 Success Criteria

- [ ] Users can view their assigned tasks across all projects
- [ ] Dashboard respects existing role-based permissions
- [ ] Performance is acceptable for typical user loads
- [ ] All tests pass with >90% coverage
- [ ] API follows existing code patterns and conventions
- [ ] No circular dependencies introduced
- [ ] Clean, maintainable code structure

This battle plan provides a comprehensive roadmap for implementing the Dashboard API while maintaining the existing architecture's integrity and following established patterns.
