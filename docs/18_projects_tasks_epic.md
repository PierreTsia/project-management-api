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
- [ ] Create `ProjectRole` enum with OWNER, ADMIN, WRITE, READ values
- [ ] Create `ProjectContributor` entity with role field and relationships
- [ ] Create `IProjectPermissionService` interface
- [ ] Create basic `ProjectPermissionService` implementation (skeleton only)
- [ ] Add migration for project_contributors table
- [ ] Write unit tests for enum and interface
- [ ] Verify TypeORM relationships work correctly

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
- [ ] Implement project creation with automatic owner assignment
- [ ] Create `ProjectContributor` record when project is created
- [ ] Implement `ProjectPermissionService.hasProjectPermission()` method
- [ ] Add owner-only endpoints (DELETE project, manage contributors)
- [ ] Create `ProjectPermissionGuard` (basic implementation)
- [ ] Add `@RequireProjectRole()` decorator
- [ ] Write unit tests for permission service
- [ ] Write e2e tests for owner-only operations

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
- [ ] Create `Task` entity with all required fields (id, title, description, status, priority, dueDate, createdAt, updatedAt, projectId, assigneeId)
- [ ] Create `TaskService` with basic CRUD operations
- [ ] Create `TasksController` with REST endpoints
- [ ] Create DTOs for task operations (CreateTaskDto, UpdateTaskDto, TaskResponseDto)
- [ ] Add validation for task fields
- [ ] Write unit tests for service methods
- [ ] Write e2e tests for controller endpoints
- [ ] Add migration for tasks table
- [ ] Test task creation within projects

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
- [ ] Implement task assignment to users
- [ ] Add task status transitions (TODO → IN_PROGRESS → DONE)
- [ ] Create task assignment endpoints
- [ ] Add validation for status transitions
- [ ] Implement assignee-only operations (update status)
- [ ] Write unit tests for assignment logic
- [ ] Write e2e tests for status transitions

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
- [ ] Create `Comment` entity with content, createdAt, updatedAt, taskId, userId
- [ ] Create `CommentService` with CRUD operations
- [ ] Create `CommentsController` with endpoints
- [ ] Create DTOs for comment operations
- [ ] Add validation for comment content
- [ ] Write unit tests for comment service
- [ ] Write e2e tests for comment endpoints
- [ ] Add migration for comments table
- [ ] Test comment creation on tasks

**Acceptance Criteria:**
- Project contributors can add comments to tasks
- Comments show author and timestamp
- Users can edit their own comments
- Users can delete their own comments
- Project admins can delete any comment
- Comments are properly associated with tasks

---

#### Task 3.2: File Attachments
**Estimated Time:** 2-3 hours  
**Dependencies:** Task 2.1, Task 1.3  
**Value:** File sharing and document management

**Definition of Done:**
- [ ] Create `Attachment` entity with filename, fileType, fileSize, uploadedAt, taskId, userId
- [ ] Create `AttachmentService` with upload/download operations
- [ ] Create `AttachmentsController` with file endpoints
- [ ] Integrate with existing Cloudinary service
- [ ] Add file validation (size, type limits)
- [ ] Write unit tests for attachment service
- [ ] Write e2e tests for file upload/download
- [ ] Add migration for attachments table
- [ ] Test file upload to tasks

**Acceptance Criteria:**
- Users can upload files to tasks
- File size and type restrictions are enforced
- Files are stored in Cloudinary
- Users can download attached files
- Users can delete their own attachments
- Project admins can delete any attachment

---

### Phase 4: Advanced Permissions & Search

#### Task 4.1: Contributor Management
**Estimated Time:** 2-3 hours  
**Dependencies:** Task 1.3  
**Value:** Team management and role administration

**Definition of Done:**
- [ ] Create contributor management endpoints (add, remove, update role)
- [ ] Implement role change validation (only owners/admins can change roles)
- [ ] Add contributor listing endpoint
- [ ] Create DTOs for contributor operations
- [ ] Add validation for role changes
- [ ] Write unit tests for contributor management
- [ ] Write e2e tests for role changes
- [ ] Test all role-based permissions

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
- [ ] Create `SearchTasksDto` with query, status, priority, assigneeId, page, limit fields
- [ ] Create `SearchProjectsDto` with query, status, page, limit fields
- [ ] Implement `TaskService.searchTasks()` method using TypeORM QueryBuilder
- [ ] Implement `ProjectService.searchProjects()` method using TypeORM QueryBuilder
- [ ] Add search endpoints to controllers (`GET /projects/:projectId/tasks/search`, `GET /projects/search`)
- [ ] Add validation using class-validator decorators for all search parameters
- [ ] Implement case-insensitive text search using `ILIKE` with wildcards
- [ ] Add filtering by status, priority, assignee (tasks) and status (projects)
- [ ] Implement pagination with configurable page size (default: 20, max: 100)
- [ ] Add proper ordering (newest first by default)
- [ ] Create `PaginationHelper` utility class for consistent pagination responses
- [ ] Write unit tests for search service methods (minimum 80% coverage)
- [ ] Write e2e tests for search endpoints with various filter combinations
- [ ] Test search performance with sample data
- [ ] Add database indexes for search performance (projectId, assigneeId, status, priority)
- [ ] Test all search scenarios manually with Postman/curl

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
- [ ] Create project progress endpoint (task completion stats)
- [ ] Implement contributor activity metrics
- [ ] Add project overview statistics
- [ ] Create reporting DTOs
- [ ] Write unit tests for reporting logic
- [ ] Write e2e tests for reporting endpoints
- [ ] Test reporting with sample data

**Acceptance Criteria:**
- Project owners can view completion statistics
- Activity metrics show contributor engagement
- Reports respect project permissions
- Data is calculated correctly
- Performance is acceptable

---

#### Task 5.2: API Documentation & Final Testing
**Estimated Time:** 1-2 hours  
**Dependencies:** All previous tasks  
**Value:** Production readiness and developer experience

**Definition of Done:**
- [ ] Add Swagger/OpenAPI documentation
- [ ] Create comprehensive API documentation
- [ ] Perform end-to-end testing of all features
- [ ] Fix any discovered bugs
- [ ] Optimize database queries
- [ ] Add rate limiting if needed
- [ ] Create deployment checklist

**Acceptance Criteria:**
- All API endpoints are documented
- Documentation is accurate and helpful
- All features work correctly together
- Performance meets requirements
- Code is production-ready

---

## Implementation Notes

### Priority Order
1. **Start with Phase 1** - Foundation is critical
2. **Complete each task fully** before moving to the next
3. **Test thoroughly** at each step
4. **Commit frequently** with descriptive messages

### Testing Strategy
- **Unit tests** for all services and utilities
- **E2E tests** for all controller endpoints
- **Manual testing** with Postman/curl for each task
- **Integration testing** between related features

### Database Migrations
- Create migrations for each entity
- Test migrations on clean database
- Include rollback scripts if needed

### Security Considerations
- Validate all inputs
- Check permissions at service level
- Use proper error handling
- Sanitize user data

