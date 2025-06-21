import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ProjectProgressCurrentDto {
  @ApiProperty()
  totalTasks: number;

  @ApiProperty()
  completedTasks: number;

  @ApiProperty()
  inProgressTasks: number;

  @ApiProperty()
  todoTasks: number;

  @ApiProperty()
  completionPercentage: number;
}

class ProjectProgressTrendDailyDto {
  @ApiProperty()
  date: string;

  @ApiProperty()
  totalTasks: number;

  @ApiProperty()
  completedTasks: number;

  @ApiProperty()
  newTasks: number;

  @ApiProperty()
  completionRate: number;

  @ApiProperty()
  commentsAdded: number;
}

class ProjectProgressTrendWeeklyDto {
  @ApiProperty()
  week: string;

  @ApiProperty()
  totalTasks: number;

  @ApiProperty()
  completedTasks: number;

  @ApiProperty()
  newTasks: number;

  @ApiProperty()
  completionRate: number;
}

class ProjectProgressTrendsDto {
  @ApiProperty({ type: [ProjectProgressTrendDailyDto] })
  daily: ProjectProgressTrendDailyDto[];

  @ApiProperty({ type: [ProjectProgressTrendWeeklyDto] })
  weekly: ProjectProgressTrendWeeklyDto[];
}

class ProjectProgressRecentActivityDto {
  @ApiProperty()
  tasksCreated: number;

  @ApiProperty()
  tasksCompleted: number;

  @ApiProperty()
  commentsAdded: number;

  @ApiProperty()
  attachmentsUploaded: number;
}

export class ProjectProgressDto {
  @ApiProperty({ type: ProjectProgressCurrentDto })
  current: ProjectProgressCurrentDto;

  @ApiPropertyOptional({ type: ProjectProgressTrendsDto })
  trends?: ProjectProgressTrendsDto;

  @ApiPropertyOptional({ type: ProjectProgressRecentActivityDto })
  recentActivity?: ProjectProgressRecentActivityDto;
}
