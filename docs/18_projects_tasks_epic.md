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
