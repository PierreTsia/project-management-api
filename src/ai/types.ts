export type ProjectType = 'academic' | 'professional' | 'personal' | 'team';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ProjectHealthRequestDto {
  projectId: string;
  projectType?: ProjectType;
  includeRecommendations?: boolean;
}

export interface HealthRiskDto {
  id: string;
  title: string;
  severity: Priority;
}

export interface HealthRecommendationDto {
  id: string;
  title: string;
  rationale: string;
}

export interface ProjectHealthResponseDto {
  healthScore: number;
  risks: ReadonlyArray<HealthRiskDto>;
  recommendations: ReadonlyArray<HealthRecommendationDto>;
}

export interface GenerateTasksRequestDto {
  projectId: string;
  requirement: string;
  projectType?: ProjectType;
  priority?: Priority;
}

export interface GeneratedTaskDto {
  title: string;
  description: string;
  estimateHours: number;
  priority: Priority;
  dependencyIds: ReadonlyArray<string>;
  assigneeSuggestion?: string;
}

export interface GenerateTasksResponseDto {
  tasks: ReadonlyArray<GeneratedTaskDto>;
}
