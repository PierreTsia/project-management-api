# Projects and Tasks Epic

## Domain Entities & Relationships

### Core Entities

1. **Project**

   - Properties:
     - id, name, description, status (ACTIVE/ARCHIVED)
     - createdAt, updatedAt
     - owner (User)
     - status (ACTIVE/ARCHIVED)
   - Relationships:
     - has many Tasks
     - has many ProjectContributors
     - belongs to Owner (User)

2. **Task**

   - Properties:
     - id, title, description
     - status (TODO/IN_PROGRESS/DONE)
     - priority (LOW/MEDIUM/HIGH)
     - dueDate
     - createdAt, updatedAt
     - assignee (User)
   - Relationships:
     - belongs to Project
     - belongs to Assignee (User)
     - has many Comments
     - has many Attachments

3. **ProjectContributor**
   - Properties:
     - id
     - role (READ/WRITE/DELETE/ADMIN)
     - joinedAt
   - Relationships:
     - belongs to Project
     - belongs to User

### Supporting Entities

4. **Comment**

   - Properties:
     - id, content
     - createdAt, updatedAt
   - Relationships:
     - belongs to Task
     - belongs to User

5. **Attachment**
   - Properties:
     - id, filename, fileType, fileSize
     - uploadedAt
   - Relationships:
     - belongs to Task
     - belongs to User

## User Roles & Permissions

### Project Roles

1. **Owner**

   - Full control over project
   - Can manage contributors
   - Can archive/delete project

2. **Admin**

   - Can manage contributors
   - Can manage all tasks
   - Cannot delete project

3. **Contributor (WRITE)**

   - Can create/edit tasks
   - Can comment on tasks
   - Can upload attachments

4. **Contributor (READ)**
   - Can view project and tasks
   - Can comment on tasks
   - Cannot modify tasks

### Task-level Permissions

- Task Assignee can update task status
- Task Creator can edit task details
- Project Admins can manage all tasks
- Project Contributors (WRITE) can create new tasks

## Key Features to Consider

1. **Task Management**

   - Task creation/editing
   - Status updates
   - Priority management
   - Due date tracking
   - Assignment handling

2. **Project Management**

   - Project creation/editing
   - Contributor management
   - Status tracking
   - Activity logging

3. **Collaboration**

   - Comments on tasks
   - File attachments
   - @mentions in comments
   - Activity notifications

4. **Search & Filtering**

   - Task search by title/description
   - Filter by status/priority/assignee
   - Project search
   - Advanced filtering options

5. **Reporting**
   - Project progress tracking
   - Task completion statistics
   - Contributor activity metrics

## Role Implementation Approach

### Overview
We'll use a **Guard-based approach with enum-based roles** following NestJS best practices. This provides a clean, testable, and maintainable solution that aligns with the framework's patterns and avoids circular dependencies through proper interface-based dependency injection.

### Architecture Components

1. **Role Enum** - Defines the four project roles
2. **ProjectContributor Entity** - Manages user-project relationships with roles
3. **Permission Interface** - Clean contract for permission checking
4. **Permission Service** - Contains business logic for role validation
5. **Permission Guards** - Handle authorization at controller level
6. **Custom Decorators** - Simplify permission checks in controllers

### Code Structure

```typescript
// Enums
enum ProjectRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN', 
  WRITE = 'WRITE',
  READ = 'READ'
}

// Entity
@Entity('project_contributors')
class ProjectContributor {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column({ type: 'enum', enum: ProjectRole })
  role: ProjectRole;
  
  @ManyToOne(() => Project)
  project: Project;
  
  @ManyToOne(() => User)
  user: User;
}

// Interface (Clean Contract)
interface IProjectPermissionService {
  hasProjectPermission(userId: string, projectId: string, requiredRole: ProjectRole): Promise<boolean>;
  getUserProjectRole(userId: string, projectId: string): Promise<ProjectRole | null>;
}

// Service Implementation
@Injectable()
class ProjectPermissionService implements IProjectPermissionService {
  constructor(
    @InjectRepository(ProjectContributor)
    private projectContributorRepository: Repository<ProjectContributor>
  ) {}

  async hasProjectPermission(userId: string, projectId: string, requiredRole: ProjectRole): Promise<boolean> {
    const userRole = await this.getUserProjectRole(userId, projectId);
    return this.isRoleSufficient(userRole, requiredRole);
  }

  private isRoleSufficient(userRole: ProjectRole | null, requiredRole: ProjectRole): boolean {
    if (!userRole) return false;
    
    const roleHierarchy = {
      [ProjectRole.OWNER]: 4,
      [ProjectRole.ADMIN]: 3,
      [ProjectRole.WRITE]: 2,
      [ProjectRole.READ]: 1
    };
    
    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  }
}

// Guard
@Injectable()
class ProjectPermissionGuard implements CanActivate {
  constructor(
    private projectPermissionService: IProjectPermissionService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const projectId = request.params.projectId;
    const requiredRole = this.reflector.get<ProjectRole>('requiredRole', context.getHandler());
    
    return this.projectPermissionService.hasProjectPermission(user.id, projectId, requiredRole);
  }
}

// Module Configuration
@Module({
  imports: [TypeOrmModule.forFeature([Project, ProjectContributor])],
  providers: [
    ProjectService,
    ProjectPermissionService,
    ProjectPermissionGuard,
    {
      provide: IProjectPermissionService,
      useClass: ProjectPermissionService
    }
  ],
  exports: [IProjectPermissionService], // Export interface, not implementation
  controllers: [ProjectsController]
})
export class ProjectsModule {}

// Usage in Controllers
@RequireProjectRole(ProjectRole.WRITE)
@Post(':projectId/tasks')
createTask(@Param('projectId') projectId: string, @Body() createTaskDto: CreateTaskDto) {
  // Controller logic
}

// Usage in Other Modules
@Injectable()
class UsersService {
  constructor(
    @Inject(IProjectPermissionService)
    private projectPermissionService: IProjectPermissionService
  ) {}

  async canUserAccessProject(userId: string, projectId: string): Promise<boolean> {
    return this.projectPermissionService.hasProjectPermission(userId, projectId, ProjectRole.READ);
  }
}
```

### Permission Hierarchy
- **OWNER** > **ADMIN** > **WRITE** > **READ**
- Higher roles inherit permissions from lower roles
- Task-level permissions are additive to project roles
- **Project-dependent roles**: User can have different roles across different projects

### Key Design Decisions

1. **Interface-Based Dependency Injection**: Avoids circular dependencies by exporting interfaces instead of concrete implementations
2. **Single Responsibility**: Permission logic stays within the projects module
3. **Repository Pattern**: Clean data access through TypeORM repositories
4. **Hierarchical Role System**: Numeric hierarchy for easy permission comparison
5. **Async Permission Checks**: Supports database queries for role resolution

### Benefits
- **No Circular Dependencies**: Interface-based architecture prevents dependency cycles
- **Testable**: Guards and services can be unit tested independently with mocked interfaces
- **Composable**: Guards can be combined and reused across different controllers
- **Maintainable**: Clear separation of concerns with single responsibility principle
- **Extensible**: Easy to add new roles or permissions without breaking existing code
- **NestJS-native**: Follows framework conventions and dependency injection patterns
- **Type-Safe**: Full TypeScript support with proper interfaces and enums

## Search Implementation Approach

### Overview
We'll use a **TypeORM QueryBuilder approach** for search functionality, prioritizing simplicity and quick implementation over advanced features. This provides a working search solution that fits within our 2-3 hour task timeframe while delivering immediate value to users.

### Architecture Components

1. **Search DTOs** - Define search parameters and validation
2. **QueryBuilder Methods** - Handle complex search queries
3. **Pagination Helper** - Manage result sets efficiently
4. **Search Service Methods** - Business logic for search operations
5. **Controller Endpoints** - REST API for search functionality

### Code Structure

```typescript
// Search DTOs
export class SearchTasksDto {
  @IsOptional()
  @IsString()
  query?: string; // Search in title and description

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class SearchProjectsDto {
  @IsOptional()
  @IsString()
  query?: string; // Search in name and description

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

// Service Implementation
@Injectable()
class TaskService {
  async searchTasks(projectId: string, searchDto: SearchTasksDto): Promise<{ tasks: Task[], total: number, page: number, limit: number }> {
    const queryBuilder = this.tasksRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .where('task.projectId = :projectId', { projectId });

    // Text search (case-insensitive)
    if (searchDto.query) {
      queryBuilder.andWhere(
        '(task.title ILIKE :query OR task.description ILIKE :query)',
        { query: `%${searchDto.query}%` }
      );
    }

    // Status filter
    if (searchDto.status) {
      queryBuilder.andWhere('task.status = :status', { status: searchDto.status });
    }

    // Priority filter
    if (searchDto.priority) {
      queryBuilder.andWhere('task.priority = :priority', { priority: searchDto.priority });
    }

    // Assignee filter
    if (searchDto.assigneeId) {
      queryBuilder.andWhere('task.assigneeId = :assigneeId', { assigneeId: searchDto.assigneeId });
    }

    // Pagination
    const skip = (searchDto.page - 1) * searchDto.limit;
    queryBuilder.skip(skip).take(searchDto.limit);

    // Order by creation date (newest first)
    queryBuilder.orderBy('task.createdAt', 'DESC');

    const [tasks, total] = await queryBuilder.getManyAndCount();
    
    return {
      tasks,
      total,
      page: searchDto.page,
      limit: searchDto.limit
    };
  }
}

// Controller Implementation
@Controller('projects/:projectId/tasks')
class TasksController {
  @Get('search')
  @RequireProjectRole(ProjectRole.READ)
  async searchTasks(
    @Param('projectId') projectId: string,
    @Query() searchDto: SearchTasksDto
  ): Promise<{ tasks: Task[], total: number, page: number, limit: number }> {
    return this.taskService.searchTasks(projectId, searchDto);
  }
}

// Pagination Helper (Optional)
export class PaginationHelper {
  static createPaginationResponse<T>(
    items: T[],
    total: number,
    page: number,
    limit: number
  ) {
    const totalPages = Math.ceil(total / limit);
    
    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }
}
```

### Search Capabilities

1. **Text Search**
   - Case-insensitive search in task titles and descriptions
   - Uses `ILIKE` with wildcards for partial matching
   - Example: "bug" matches "Fix the login bug" and "Database bug report"

2. **Filtering**
   - Status filter (TODO, IN_PROGRESS, DONE)
   - Priority filter (LOW, MEDIUM, HIGH)
   - Assignee filter (by user ID)
   - Project status filter (for project search)

3. **Pagination**
   - Configurable page size (default: 20, max: 100)
   - Page-based navigation
   - Total count for UI pagination controls

4. **Sorting**
   - Default: Newest tasks first (createdAt DESC)
   - Can be extended for priority, due date, etc.

### Performance Considerations

1. **Database Indexes**
   - Index on `projectId` for project filtering
   - Index on `assigneeId` for assignee filtering
   - Index on `status` and `priority` for filtering
   - Consider full-text indexes for PostgreSQL if needed later

2. **Query Optimization**
   - Use `leftJoinAndSelect` only when needed
   - Limit result sets with pagination
   - Avoid N+1 queries with proper joins

3. **Caching Strategy**
   - Consider Redis caching for frequent searches
   - Cache project member lists for permission checks

### Future Enhancements

1. **Full-Text Search** (PostgreSQL)
   - Upgrade to `to_tsvector` and `plainto_tsquery`
   - Add relevance scoring
   - Handle typos and word variations

2. **Advanced Features**
   - Search in comments
   - Search by date ranges
   - Search by multiple assignees
   - Saved searches

3. **External Search Services**
   - Elasticsearch for complex queries
   - Algolia for autocomplete
   - Meilisearch for simple setup

### Benefits
- **Simple Implementation**: Uses existing TypeORM patterns
- **Quick Development**: 2-3 hour implementation time
- **Good Performance**: Efficient database queries
- **Easy Testing**: Standard repository testing patterns
- **Extensible**: Can upgrade to advanced search later
- **No Dependencies**: Uses existing database setup

## Implementation Roadmap

### Phase 1: Foundation (Core Entities & Basic CRUD)

#### Task 1.1: Project Entity & Basic CRUD
**Estimated Time:** 2-3 hours  
**Dependencies:** None  
**Value:** Core project management functionality

**Definition of Done:**
- [x] Create `Project` entity with all required fields (id, name, description, status, createdAt, updatedAt, ownerId)
- [x] Create `ProjectService` with basic CRUD operations (create, findOne, findAll, update, delete)
- [x] Create `ProjectsController` with REST endpoints (POST /projects, GET /projects, GET /projects/:id, PUT /projects/:id, DELETE /projects/:id)
- [x] Create DTOs for project operations (CreateProjectDto, UpdateProjectDto, ProjectResponseDto)
- [x] Add validation using class-validator decorators
- [x] Write unit tests for service methods (minimum 80% coverage)
- [x] Write e2e tests for controller endpoints
- [x] Add migration for projects table
- [x] Test all endpoints manually with Postman/curl

**Acceptance Criteria:**
- User can create a new project with name and description
- User can view their projects list
- User can view individual project details
- User can update project information
- User can delete their own projects
- All operations require valid JWT authentication
- Proper error handling for invalid requests

---

#### Task 1.2: Project Role Enum & Basic Permission Structure
**Estimated Time:** 1-2 hours  
**Dependencies:** Task 1.1  
**Value:** Foundation for role-based access control

**Definition of Done:**
- [x] Create `ProjectRole` enum with OWNER, ADMIN, WRITE, READ values
- [x] Create `ProjectContributor` entity with role field and relationships
- [x] Create `IProjectPermissionService` interface
- [x] Create basic `ProjectPermissionService` implementation (skeleton only)
- [x] Add migration for project_contributors table
- [x] Write unit tests for enum and interface
- [x] Verify TypeORM relationships work correctly

**Acceptance Criteria:**
- ProjectRole enum is properly defined and exported
- ProjectContributor entity has correct TypeORM decorators
- Interface defines required methods for permission checking
- Database migration runs successfully
- All tests pass

---

#### Task 1.3: Project Owner Assignment & Basic Permissions
**Estimated Time:** 2-3 hours  
**Dependencies:** Task 1.1, Task 1.2  
**Value:** Project ownership and basic access control

**Definition of Done:**
- [x] Implement project creation with automatic owner assignment
- [x] Create `ProjectContributor` record when project is created
- [x] Implement `ProjectPermissionService.hasProjectPermission()` method
- [x] Add owner-only endpoints (DELETE project, manage contributors)
- [x] Create `ProjectPermissionGuard` (basic implementation)
- [x] Add `@RequireProjectRole()` decorator
- [x] Write unit tests for permission service
- [x] Write e2e tests for owner-only operations

**Acceptance Criteria:**
- Project creator automatically becomes OWNER
- ProjectContributor record is created with OWNER role
- Permission service correctly validates OWNER permissions
- Owner can delete their projects
- Non-owners cannot delete projects
- All permission checks work correctly

---

### Phase 2: Task Management

#### Task 2.1: Task Entity & Basic CRUD
**Estimated Time:** 2-3 hours  
**Dependencies:** Task 1.1  
**Value:** Core task management functionality

**Definition of Done:**
- [x] Create `Task` entity with all required fields (id, title, description, status, priority, dueDate, createdAt, updatedAt, projectId, assigneeId)
- [x] Create `TaskService` with basic CRUD operations
- [x] Create `TasksController` with REST endpoints
- [x] Create DTOs for task operations (CreateTaskDto, UpdateTaskDto, TaskResponseDto)
- [x] Add validation for task fields
- [x] Write unit tests for service methods
- [x] Write e2e tests for controller endpoints
- [x] Add migration for tasks table
- [x] Test task creation within projects

**Acceptance Criteria:**
- User can create tasks within a project
- User can view tasks for a project
- User can update task details
- User can delete tasks
- Tasks are properly associated with projects
- Task status and priority enums work correctly

---

#### Task 2.2: Task Assignment & Status Management
**Estimated Time:** 2 hours  
**Dependencies:** Task 2.1, Task 1.3  
**Value:** Task workflow and assignment functionality

**Definition of Done:**
- [x] Implement task assignment to users
- [x] Add task status transitions (TODO → IN_PROGRESS → DONE)
- [x] Create task assignment endpoints
- [x] Add validation for status transitions
- [x] Implement assignee-only operations (update status) - NOTE : currently the status can be updated by the upadate task dto - we should consider this as a pb ?
- [x] Write unit tests for assignment logic
- [x] Write tests for status transitions

**Acceptance Criteria:**
- Tasks can be assigned to project contributors
- Only assignees can update task status
- Status transitions follow proper workflow
- Project admins can reassign tasks
- Proper error handling for invalid assignments

---

### Phase 3: Collaboration Features

#### Task 3.1: Comments System
**Estimated Time:** 2-3 hours  
**Dependencies:** Task 2.1, Task 1.3  
**Value:** Team collaboration on tasks

**Definition of Done:**
- [x] Create `Comment` entity with content, createdAt, updatedAt, taskId, userId
- [x] Create `CommentService` with CRUD operations
- [x] Create `CommentsController` with endpoints
- [x] Create DTOs for comment operations
- [x] Add validation for comment content
- [x] Write unit tests for comment service
- [x] Write e2e tests for comment endpoints
- [x] Add migration for comments table
- [x] Test comment creation on tasks

**Acceptance Criteria:**
- Project contributors can add comments to tasks
- Comments show author and timestamp
- Users can edit their own comments
- Users can delete their own comments
- Project admins can delete any comment
- Comments are properly associated with tasks

---

#### Task 3.2: File Attachments System
**Estimated Time:** 3-4 hours  
**Dependencies:** Task 2.1, Task 1.3, CloudinaryService  
**Value:** File sharing and document management for both projects and tasks

**Definition of Done:**
- [x] Create generic `Attachment` entity with polymorphic relationships (entityType: 'PROJECT' | 'TASK', entityId)
- [x] Extend existing `CloudinaryService` with generic file upload methods
- [x] Create `AttachmentsService` with upload/download/delete operations for both projects and tasks
- [x] Create `AttachmentsController` with unified file endpoints
- [x] Add file validation (size, type limits) - support common document types (PDF, DOC, images, etc.)
- [x] Implement proper folder structure in Cloudinary (projects/attachments, tasks/attachments)
- [x] Add permission checks (project contributors can upload, admins can delete any)
- [x] Write unit tests for attachment service
- [x] Write tests for file upload/download/delete
- [x] Add migration for attachments table
- [x] Test file upload to both projects and tasks

**Acceptance Criteria:**
- [x] Users can upload files to both projects and tasks
- [x] File size and type restrictions are enforced (extend beyond just images)
- [x] Files are stored in Cloudinary with proper folder organization
- [x] Users can download attached files
- [x] Users can delete their own attachments
- [x] Project admins can delete any attachment
- [x] Proper permission checks based on project roles
- [x] Support for common file types: PDF, DOC, DOCX, TXT, images, etc.
- [x] Clean file cleanup when attachments are deleted

**Technical Design:**
- **Entity**: Single `Attachment` entity with `entityType` and `entityId` for polymorphic relationships
- **Service**: Extend existing `CloudinaryService` with `uploadFile()` method
- **Folders**: `{projectName}/{env}/projects/{projectId}/attachments` and `{projectName}/{env}/tasks/{taskId}/attachments`
- **File Types**: Extend beyond images to include documents, spreadsheets, etc.
- **Size Limits**: Configurable per file type (e.g., 10MB for documents, 5MB for images)
- **Permissions**: Inherit from project permission system

**API Endpoints:**
```
POST /api/v1/projects/:projectId/attachments - Upload project attachment
GET /api/v1/projects/:projectId/attachments - List project attachments
DELETE /api/v1/projects/:projectId/attachments/:attachmentId - Delete project attachment

POST /api/v1/projects/:projectId/tasks/:taskId/attachments - Upload task attachment
GET /api/v1/projects/:projectId/tasks/:taskId/attachments - List task attachments
DELETE /api/v1/projects/:projectId/tasks/:taskId/attachments/:attachmentId - Delete task attachment
```

---

### Phase 4: Advanced Permissions & Search

#### Task 4.1: Contributor Management
**Estimated Time:** 2-3 hours  
**Dependencies:** Task 1.3  
**Value:** Team management and role administration

**Definition of Done:**
- [x] Create contributor management endpoints (add, remove, update role)
- [x] Implement role change validation (only owners/admins can change roles)
- [x] Add contributor listing endpoint
- [x] Create DTOs for contributor operations
- [x] Add validation for role changes
- [x] Write unit tests for contributor management
- [x] Write e2e tests for role changes
- [x] Test all role-based permissions

**Acceptance Criteria:**
- Project owners can add/remove contributors
- Project admins can add contributors and change roles
- Role changes follow proper hierarchy
- Contributors can view project member list
- Proper error handling for unauthorized role changes

---

#### Task 4.2: Search & Filtering
**Estimated Time:** 2-3 hours  
**Dependencies:** Task 2.1, Task 3.1  
**Value:** Improved user experience and task discovery

**Definition of Done:**
- [x] Create `SearchTasksDto` with query, status, priority, assigneeId, page, limit fields
- [x] Create `SearchProjectsDto` with query, status, page, limit fields
- [x] Implement `TaskService.searchTasks()` method using TypeORM QueryBuilder
- [x] Implement `ProjectService.searchProjects()` method using TypeORM QueryBuilder
- [x] Add search endpoints to controllers (`GET /projects/:projectId/tasks/search`, `GET /projects/search`)
- [x] Add validation using class-validator decorators for all search parameters
- [x] Implement case-insensitive text search using `ILIKE` with wildcards
- [x] Add filtering by status, priority, assignee (tasks) and status (projects)
- [x] Implement pagination with configurable page size (default: 20, max: 100)
- [x] Add proper ordering (newest first by default)
- [x] Create `PaginationHelper` utility class for consistent pagination responses
- [x] Write unit tests for search service methods (minimum 80% coverage)
- [x] Write tests for search endpoints with various filter combinations
- [x] Test search performance with sample data
- [x] Add database indexes for search performance (projectId, assigneeId, status, priority)
- [x] Test all search scenarios manually with Postman/curl

**Acceptance Criteria:**
- Users can search tasks by title/description with case-insensitive partial matching
- Users can filter tasks by status (TODO/IN_PROGRESS/DONE), priority (LOW/MEDIUM/HIGH), and assignee
- Users can search projects by name/description with case-insensitive partial matching
- Users can filter projects by status (ACTIVE/ARCHIVED)
- Search results are paginated with configurable page size
- Search respects project permissions (users can only search within accessible projects)
- Search performance is acceptable with large datasets (response time < 500ms)
- All search parameters are properly validated
- Search results include total count for UI pagination controls
- Error handling for invalid search parameters

---

### Phase 5: Reporting & Polish

#### Task 5.1: Basic Reporting
**Estimated Time:** 2-3 hours  
**Dependencies:** Task 2.1, Task 4.1  
**Value:** Project insights and progress tracking

**Definition of Done:**
- [x] Create `ProjectSnapshot` entity with daily metrics storage
- [x] Add migration for project_snapshots table
- [x] Create `ProjectSnapshotService` with daily cron job for snapshot generation
- [ ] Implement `getProjectProgress()` method that combines real-time + snapshot data
- [ ] Add `GET /projects/:id/progress` endpoint to `ProjectsController`
- [ ] Create `ProjectProgressDto` with current stats, trends, and recent activity
- [x] Write unit tests for snapshot generation and progress calculation
- [ ] Write e2e tests for progress endpoint
- [ ] Test progress calculation with sample data

**Acceptance Criteria:**
- Project owners can view completion statistics
- Activity metrics show contributor engagement
- Reports respect project permissions
- Data is calculated correctly
- Performance is acceptable

**Technical Design:**

### Project Snapshot Entity
```typescript
@Entity('project_snapshots')
export class ProjectSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @Column({ name: 'snapshot_date', type: 'date' })
  snapshotDate: Date;

  // Task metrics
  @Column({ name: 'total_tasks', default: 0 })
  totalTasks: number;

  @Column({ name: 'completed_tasks', default: 0 })
  completedTasks: number;

  @Column({ name: 'in_progress_tasks', default: 0 })
  inProgressTasks: number;

  @Column({ name: 'todo_tasks', default: 0 })
  todoTasks: number;

  @Column({ name: 'new_tasks_today', default: 0 })
  newTasksToday: number;

  @Column({ name: 'completed_tasks_today', default: 0 })
  completedTasksToday: number;

  // Activity metrics
  @Column({ name: 'comments_added_today', default: 0 })
  commentsAddedToday: number;

  @Column({ name: 'attachments_uploaded_today', default: 0 })
  attachmentsUploadedToday: number;

  // Calculated fields
  @Column({ name: 'completion_percentage', type: 'decimal', precision: 5, scale: 2, default: 0 })
  completionPercentage: number;

  @CreateDateColumn()
  createdAt: Date;
}
```

### Project Progress DTO
```typescript
interface ProjectProgressDto {
  // Current stats (real-time)
  current: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    todoTasks: number;
    completionPercentage: number;
  };
  
  // Historical trends (from snapshots)
  trends: {
    daily: Array<{
      date: string; // YYYY-MM-DD
      totalTasks: number;
      completedTasks: number;
      newTasks: number;
      completionRate: number;
      commentsAdded: number;
    }>;
    
    weekly: Array<{
      week: string; // YYYY-WW
      totalTasks: number;
      completedTasks: number;
      newTasks: number;
      completionRate: number;
    }>;
  };
  
  // Recent activity (last 7 days)
  recentActivity: {
    tasksCreated: number;
    tasksCompleted: number;
    commentsAdded: number;
    attachmentsUploaded: number;
  };
}
```

### Snapshot Service with Cron Job
```typescript
@Injectable()
export class ProjectSnapshotService {
  constructor(
    @InjectRepository(ProjectSnapshot)
    private snapshotRepository: Repository<ProjectSnapshot>,
    private projectsService: ProjectsService,
    private tasksService: TasksService,
    private commentsService: CommentsService,
    private attachmentsService: AttachmentsService,
    private logger: CustomLogger,
  ) {
    this.logger.setContext('ProjectSnapshotService');
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateDailySnapshots() {
    this.logger.log('Starting daily project snapshots generation...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    try {
      const projects = await this.projectsService.findAllActive();

      for (const project of projects) {
        await this.generateSnapshotForProject(project.id, today);
      }

      this.logger.log(`Generated snapshots for ${projects.length} projects`);
    } catch (error) {
      this.logger.error('Error generating daily snapshots', error.stack);
    }
  }

  private async generateSnapshotForProject(projectId: string, date: Date) {
    // Calculate all metrics for the project using services
    const metrics = await this.calculateProjectMetrics(projectId, date);
    
    // Save or update snapshot
    await this.snapshotRepository.save({
      projectId,
      snapshotDate: date,
      ...metrics,
    });
  }

  private async calculateProjectMetrics(projectId: string, date: Date) {
    // Use services to get data instead of direct repository access
    const tasks = await this.tasksService.findAll(projectId);
    const todayStart = new Date(date);
    const todayEnd = new Date(date);
    todayEnd.setHours(23, 59, 59, 999);

    // Calculate all metrics in a single pass through the tasks array
    const metrics = tasks.reduce((acc, task) => {
      // Count by status
      switch (task.status) {
        case TaskStatus.DONE:
          acc.completedTasks++;
          break;
        case TaskStatus.IN_PROGRESS:
          acc.inProgressTasks++;
          break;
        case TaskStatus.TODO:
          acc.todoTasks++;
          break;
      }

      // Count today's activity
      if (task.createdAt >= todayStart && task.createdAt <= todayEnd) {
        acc.newTasksToday++;
      }

      if (task.status === TaskStatus.DONE && 
          task.updatedAt >= todayStart && task.updatedAt <= todayEnd) {
        acc.completedTasksToday++;
      }

      return acc;
    }, {
      totalTasks: tasks.length,
      completedTasks: 0,
      inProgressTasks: 0,
      todoTasks: 0,
      newTasksToday: 0,
      completedTasksToday: 0,
    });

    // Calculate completion percentage
    const completionPercentage = metrics.totalTasks > 0 
      ? (metrics.completedTasks / metrics.totalTasks) * 100 
      : 0;

    // Get today's comments and attachments (would need service methods)
    const commentsAddedToday = await this.getCommentsCountForDate(projectId, todayStart, todayEnd);
    const attachmentsUploadedToday = await this.getAttachmentsCountForDate(projectId, todayStart, todayEnd);

    return {
      ...metrics,
      commentsAddedToday,
      attachmentsUploadedToday,
      completionPercentage,
    };
  }

  private async getCommentsCountForDate(projectId: string, start: Date, end: Date): Promise<number> {
    // This would need a method in CommentsService to get comments by project and date range
    // For now, placeholder implementation
    return 0;
  }

  private async getAttachmentsCountForDate(projectId: string, start: Date, end: Date): Promise<number> {
    // This would need a method in AttachmentsService to get attachments by project and date range
    // For now, placeholder implementation
    return 0;
  }
}
```

### API Endpoints
```
GET /projects/:id/progress - Get current project progress
GET /projects/:id/progress?include=trends&days=30 - Include historical trends
GET /projects/:id/progress?include=activity&days=7 - Include recent activity
```

### Implementation Steps
1. **Create migration** for `project_snapshots` table
2. **Create `ProjectSnapshot` entity**
3. **Create `ProjectSnapshotService`** with cron job
4. **Add `getProjectProgress()` method** that combines real-time + snapshot data
5. **Add progress endpoint** to `ProjectsController`
6. **Write tests** for snapshot generation and progress calculation

### Required Service Methods
To support the snapshot functionality, we need to add these methods to existing services:

#### ProjectsService
- `findAllActive()` - Get all active projects for snapshot generation

#### CommentsService  
- `getCommentsCountForProjectAndDateRange(projectId, startDate, endDate)` - Count comments for a project within a date range

#### AttachmentsService
- `getAttachmentsCountForProjectAndDateRange(projectId, startDate, endDate)` - Count attachments for a project within a date range

### Benefits of Snapshot Approach
1. **Fast Queries:** Dashboard loads instantly from pre-calculated snapshots
2. **Historical Data:** Perfect for trend analysis and charts
3. **Scalable:** Cron job runs once per day, not on every request
4. **Consistent:** All users see the same data for a given day
5. **Extensible:** Easy to add new metrics without changing API
6. **Service-based:** Follows established patterns in the codebase