# 🐛 Bug: Task Link Relationships Show Incorrect Perspective

## Summary
Task link relationships are displayed from the wrong perspective, causing tasks to show themselves as blocking/blocked by themselves instead of showing the correct bidirectional relationship.

## Problem Description
When creating a task link relationship (e.g., Task A `IS_BLOCKED_BY` Task B), the backend only stores a single link record. When querying Task B's links, it incorrectly shows "Task B `IS_BLOCKED_BY` Task B" instead of "Task B `BLOCKS` Task A".

## Current Behavior (❌ Incorrect)
```json
// Task A (Frontend Development) links:
{
  "links": [
    {
      "sourceTaskId": "frontend-task-id",
      "targetTaskId": "database-task-id", 
      "type": "IS_BLOCKED_BY"
    }
  ]
}

// Task B (Database Design) links:
{
  "links": [
    {
      "sourceTaskId": "frontend-task-id",
      "targetTaskId": "database-task-id",
      "type": "IS_BLOCKED_BY"  // ❌ Wrong! Shows itself as blocked by itself
    }
  ]
}
```

## Expected Behavior (✅ Correct)
```json
// Task A (Frontend Development) links:
{
  "links": [
    {
      "sourceTaskId": "frontend-task-id",
      "targetTaskId": "database-task-id",
      "type": "IS_BLOCKED_BY"  // ✅ Frontend is blocked by Database
    }
  ]
}

// Task B (Database Design) links:
{
  "links": [
    {
      "sourceTaskId": "database-task-id",
      "targetTaskId": "frontend-task-id", 
      "type": "BLOCKS"  // ✅ Database blocks Frontend
    }
  ]
}
```

## Root Cause
The `TaskLinkService.createLink()` method only creates a single link record instead of creating bidirectional relationships. The query logic in `listLinksByTask()` returns all links where the task is either source or target, but doesn't handle perspective inversion.

## Impact
- **User Experience**: Confusing UI showing tasks blocking themselves
- **Data Integrity**: Incorrect relationship representation
- **Frontend Workarounds**: Frontend has to implement complex perspective logic to fix backend issues

## Files Affected
- `src/tasks/services/task-link.service.ts` - `createLink()` method
- `src/tasks/services/task-link.service.ts` - `listLinksByTask()` method
- `src/tasks/controllers/task-link.controller.ts` - Link creation endpoint

## Proposed Solutions

### Option 1: Create Bidirectional Links (Recommended)
```typescript
async createLink(input: CreateTaskLinkDto): Promise<TaskLink> {
  // Create the original link
  const originalLink = await this.taskLinkRepository.save({
    projectId: input.projectId,
    sourceTaskId: input.sourceTaskId,
    targetTaskId: input.targetTaskId,
    type: input.type,
  });

  // Create the inverse link
  const inverseType = this.getInverseLinkType(input.type);
  await this.taskLinkRepository.save({
    projectId: input.projectId,
    sourceTaskId: input.targetTaskId,
    targetTaskId: input.sourceTaskId,
    type: inverseType,
  });

  return originalLink;
}

private getInverseLinkType(type: TaskLinkType): TaskLinkType {
  switch (type) {
    case 'IS_BLOCKED_BY': return 'BLOCKS';
    case 'BLOCKS': return 'IS_BLOCKED_BY';
    case 'SPLITS_TO': return 'SPLITS_FROM';
    case 'SPLITS_FROM': return 'SPLITS_TO';
    case 'DUPLICATES': return 'IS_DUPLICATED_BY';
    case 'IS_DUPLICATED_BY': return 'DUPLICATES';
    case 'RELATES_TO': return 'RELATES_TO'; // Symmetric
    default: return type;
  }
}
```

### Option 2: Fix Query Logic
```typescript
async listLinksByTask(taskId: string): Promise<TaskLinkResponseDto> {
  const links = await this.taskLinkRepository.find({
    where: [{ sourceTaskId: taskId }, { targetTaskId: taskId }],
    order: { createdAt: 'DESC' },
  });

  // Transform links to show correct perspective
  const transformedLinks = links.map(link => {
    if (link.sourceTaskId === taskId) {
      return link; // Keep as-is
    } else {
      return {
        ...link,
        sourceTaskId: link.targetTaskId,
        targetTaskId: link.sourceTaskId,
        type: this.getInverseLinkType(link.type),
      };
    }
  });

  return { links: transformedLinks, total: transformedLinks.length };
}
```

## Testing
- [ ] Create link: A `IS_BLOCKED_BY` B
- [ ] Verify A shows: "A is blocked by B"
- [ ] Verify B shows: "B blocks A"
- [ ] Test all relationship types (BLOCKS, IS_BLOCKED_BY, RELATES_TO, etc.)
- [ ] Test link deletion removes both directions
- [ ] Test existing data migration if needed

## Priority
**High** - This affects core functionality and user experience

## Labels
- `bug`
- `backend`
- `task-links`
- `high-priority`
- `breaking-change` (if Option 1 is chosen)

## Additional Notes
- Frontend currently implements workaround logic to handle this issue
- Consider data migration for existing links if implementing Option 1
- Update API documentation to reflect bidirectional relationship behavior
