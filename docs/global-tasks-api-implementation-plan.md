# Global Tasks API Implementation Plan

## 🎯 Mission Statement

Build a comprehensive global tasks API that provides workflow-focused task management across all user-accessible projects. This API will complement the existing dashboard (read-only analytics) by providing full CRUD operations, bulk actions, and advanced filtering capabilities.

## 📊 Current State Analysis

### ✅ What We Have
- **Project-scoped task endpoints** - All CRUD operations per project (`/projects/:projectId/tasks`)
- **Dashboard analytics** - Read-only overview via `/dashboard/my-tasks` and `/dashboard/summary`
- **Solid foundation** - Well-structured NestJS app with proper DI, guards, and validation
- **Permission system** - `ProjectPermissionService` with role hierarchy
- **Existing patterns** - Consistent DTO validation and API documentation

### ❌ Critical Gaps
- **No global task workflow endpoints** - All task operations are project-scoped
- **No bulk operations** - Can't update multiple tasks at once
- **Limited filtering** - Dashboard only shows assigned tasks, no advanced filtering
- **No task statistics endpoint** - Statistics only available in dashboard summary
- **No workflow-focused task management** - Dashboard is read-only, project endpoints are scoped

## 🏗 Architecture Decision

### Dashboard vs Tasks API Separation

| Aspect | Dashboard API | Tasks API |
|--------|---------------|-----------|
| **Purpose** | Analytics & Overview | Workflow & Management |
| **Data** | Aggregated, summary | Detailed, actionable |
| **Operations** | Read-only | Full CRUD + bulk |
| **Filtering** | Basic (assigned tasks) | Advanced (all user tasks) |
| **Performance** | Optimized for quick load | Optimized for workflow |
| **Caching** | Heavy caching | Light caching |

## 🚀 Implementation Plan

### Phase 1: Global Task Access (Week 1)
**Goal:** Enable global task viewing and searching across all accessible projects

#### Backend Tasks
1. **Create Global Tasks Controller**
   - `GET /tasks` - Get all user's tasks across projects
   - `GET /tasks/search` - Enhanced search with advanced filtering
   - Add project access validation (user must be contributor)

2. **Enhance Search DTOs**
   - Add `projectId` filter to search
   - Add `dueDateFrom`/`dueDateTo` range filtering
   - Add `sortBy`/`sortOrder` options
   - Add `assigneeFilter` (me/unassigned/any)
   - Add workflow-specific filters (isOverdue, hasDueDate)

3. **Update Tasks Service**
   - Add `findAllUserTasks()` method
   - Add `searchAllUserTasks()` method
   - Implement cross-project querying with proper permissions

### Phase 2: Bulk Operations (Week 1-2)
**Goal:** Enable efficient bulk task management

#### Backend Tasks
1. **Add Bulk Operation DTOs**
   - `BulkUpdateStatusDto` - Array of task IDs + new status
   - `BulkAssignTasksDto` - Array of task IDs + assignee ID
   - `BulkDeleteTasksDto` - Array of task IDs

2. **Add Bulk Methods to Tasks Service**
   - `bulkUpdateStatus()` - Update multiple task statuses
   - `bulkAssignTasks()` - Assign multiple tasks
   - `bulkDeleteTasks()` - Delete multiple tasks
   - Implement transaction handling and rollback

3. **Add Bulk Endpoints**
   - `PUT /tasks/bulk/status` - Bulk status updates
   - `PUT /tasks/bulk/assign` - Bulk assignment
   - `DELETE /tasks/bulk` - Bulk deletion

### Phase 3: Task Statistics (Week 2)
**Goal:** Provide detailed task analytics and insights

#### Backend Tasks
1. **Create Task Statistics Service**
   - `getTaskStatistics()` - Comprehensive task analytics
   - `getTaskStatisticsByProject()` - Project-specific statistics
   - Implement efficient querying for large datasets

2. **Add Statistics Endpoint**
   - `GET /tasks/stats` - Detailed task statistics
   - Support filtering by project, date ranges, etc.

### Phase 4: Testing & Polish (Week 2-3)
**Goal:** Production-ready with comprehensive testing

#### Backend Tasks
1. **Unit Tests**
   - Test all new service methods
   - Test permission validation
   - Test error handling and edge cases

2. **Integration Tests**
   - Test all new endpoints
   - Test bulk operations with transactions
   - Test performance with large datasets

3. **Performance Optimization**
   - Add database indexes for new queries
   - Implement query optimization
   - Add caching where appropriate

## 🛠 Technical Implementation Details

### Files to Create

#### Controllers
- `src/tasks/controllers/global-tasks.controller.ts` - Global task endpoints

#### DTOs
- `src/tasks/dto/global-search-tasks.dto.ts` - Enhanced search DTO
- `src/tasks/dto/bulk-update-status.dto.ts` - Bulk status update DTO
- `src/tasks/dto/bulk-assign-tasks.dto.ts` - Bulk assignment DTO
- `src/tasks/dto/bulk-delete-tasks.dto.ts` - Bulk deletion DTO
- `src/tasks/dto/task-statistics.dto.ts` - Task statistics response DTO
- `src/tasks/dto/task-stats-query.dto.ts` - Statistics query DTO

#### Services
- `src/tasks/services/global-tasks.service.ts` - Global task business logic
- `src/tasks/services/task-statistics.service.ts` - Statistics calculations

#### Tests
- `src/tasks/controllers/global-tasks.controller.spec.ts` - Controller tests
- `src/tasks/services/global-tasks.service.spec.ts` - Service tests
- `src/tasks/services/task-statistics.service.spec.ts` - Statistics service tests

### Files to Update

#### Services
- `src/tasks/tasks.service.ts` - Add global task methods
- `src/tasks/tasks.module.ts` - Register new services

### API Endpoints to Create

```typescript
// Global Tasks
GET /tasks                    - Get all user's tasks across projects
GET /tasks/search            - Enhanced search with advanced filtering
GET /tasks/stats             - Detailed task statistics

// Bulk Operations
PUT /tasks/bulk/status       - Bulk status updates
PUT /tasks/bulk/assign       - Bulk assignment
DELETE /tasks/bulk           - Bulk deletion
```

### Enhanced Search DTO

```typescript
export class GlobalSearchTasksDto {
  // Existing SearchTasksDto fields
  query?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  page?: number = 1;
  limit?: number = 20;

  // New global task filters
  projectId?: string;                    // Filter by specific project
  dueDateFrom?: string;                  // Date range filtering
  dueDateTo?: string;
  sortBy?: 'createdAt' | 'dueDate' | 'priority' | 'status' | 'title';
  sortOrder?: 'ASC' | 'DESC';
  assigneeFilter?: 'me' | 'unassigned' | 'any';
  
  // Workflow-specific filters
  isOverdue?: boolean;                   // Only overdue tasks
  hasDueDate?: boolean;                  // Only tasks with due dates
  createdFrom?: string;                  // Created date range
  createdTo?: string;
}
```

### Task Statistics DTO

```typescript
export class TaskStatisticsDto {
  totalTasks: number;
  assignedTasks: number;
  completedTasks: number;
  overdueTasks: number;
  tasksByStatus: { [key in TaskStatus]: number };
  tasksByPriority: { [key in TaskPriority]: number };
  tasksByProject: Array<{
    projectId: string;
    projectName: string;
    taskCount: number;
    completedCount: number;
    overdueCount: number;
  }>;
  completionRate: number;
  averageCompletionTime: number;         // in days
  workloadDistribution: Array<{
    assigneeId: string;
    assigneeName: string;
    taskCount: number;
    completedCount: number;
  }>;
}
```

## 🔒 Security & Permissions

### Permission Validation
- Use existing `ProjectPermissionService` for consistency
- Validate user has READ access to all requested projects
- Validate user has WRITE access for bulk operations
- Implement proper error handling for permission failures

### Data Access Patterns
- **Global task access**: User must be contributor to at least one project
- **Bulk operations**: User must have WRITE access to all affected projects
- **Statistics**: User can only see statistics for accessible projects

## 📊 Performance Considerations

### Database Optimization
- Add indexes on frequently queried fields:
  - `(projectId, assigneeId, status)`
  - `(projectId, dueDate)`
  - `(projectId, createdAt)`
  - `(assigneeId, status)`

### Query Optimization
- Use QueryBuilder for complex filtering
- Implement efficient pagination with proper ordering
- Use database transactions for bulk operations
- Consider query result caching for statistics

### Caching Strategy
- **Task lists**: Light caching (5-10 minutes)
- **Statistics**: Medium caching (15-30 minutes)
- **User permissions**: Heavy caching (1 hour)

## 🧪 Testing Strategy

### Unit Tests (Priority 1)
- **GlobalTasksService**: Test permission validation, query building, filtering
- **TaskStatisticsService**: Test calculation logic, edge cases
- **Bulk operations**: Test validation, error handling, transaction rollback

### Integration Tests (Priority 2)
- **GlobalTasksController**: Test endpoints, authentication, validation
- **Permission scenarios**: Test cross-project access, role validation
- **Bulk operations**: Test end-to-end bulk operations

### E2E Tests (Priority 3)
- **Complete workflows**: Search, filter, bulk operations
- **Performance tests**: Large dataset handling
- **Error scenarios**: Invalid permissions, non-existent tasks

## 📋 Acceptance Criteria

### Phase 1 (Global Access)
- [x] Users can view all their tasks across projects
- [x] Advanced filtering works (project, status, priority, assignee, dates)
- [x] Sorting works for all supported fields
- [x] Pagination works smoothly
- [x] Permission validation works correctly
- [x] Mobile responsive API responses

### Phase 2 (Bulk Operations)
- [x] Bulk status updates work with transaction rollback
- [x] Bulk assignment works with permission validation
- [x] Bulk deletion works with confirmation
- [x] Error handling works for partial failures
- [x] Performance is acceptable for large batches

### Phase 3 (Statistics)
- [ ] Task statistics are accurate
- [ ] Statistics support filtering by project/date
- [ ] Performance is acceptable for large datasets
- [ ] Statistics are properly cached

### Phase 4 (Production Ready)
- [ ] All tests pass
- [ ] Performance meets requirements
- [ ] Error handling is comprehensive
- [ ] Documentation is complete
- [ ] Security review passed

## 🚨 Risks & Mitigations

### Technical Risks
1. **Performance with large datasets**
   - *Mitigation*: Proper indexing, pagination, query optimization
2. **Complex permission validation**
   - *Mitigation*: Reuse existing patterns, comprehensive testing
3. **Bulk operation failures**
   - *Mitigation*: Database transactions, proper error handling

### Security Risks
1. **Cross-project data leakage**
   - *Mitigation*: Strict permission validation, comprehensive testing
2. **Bulk operation abuse**
   - *Mitigation*: Rate limiting, permission checks, audit logging

## 🎯 Success Metrics

### Performance
- Task list load time < 500ms
- Bulk operations complete < 2s for 100 tasks
- Statistics calculation < 1s
- 95th percentile performance targets met

### Quality
- 100% test coverage for new code
- Zero critical security vulnerabilities
- Zero data leakage incidents
- User satisfaction > 4.5/5

## 📅 Timeline

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| Phase 1 | 1 week | Global task access, advanced filtering |
| Phase 2 | 1 week | Bulk operations, transaction handling |
| Phase 3 | 1 week | Task statistics, performance optimization |
| Phase 4 | 1 week | Testing, polish, production readiness |

## 🚀 Next Steps

1. **Start with Phase 1** - Create global task access
2. **Implement advanced filtering** - Make it useful for daily work
3. **Add bulk operations** - Enable efficient task management
4. **Iterate based on feedback** - User testing and refinement

---

*This implementation plan is a living document. Update as we learn and iterate.*
