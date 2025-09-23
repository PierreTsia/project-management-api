export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
}

export interface TeamMemberSummary {
  id: string;
  name: string;
  role: string;
  skills: ReadonlyArray<string>;
  currentWorkload: number;
}

export interface RecentTaskPattern {
  title: string;
  timeSpent: number;
  complexity: string;
}

export interface ProjectContextSnapshot {
  project: ProjectSummary;
  team: ReadonlyArray<TeamMemberSummary>;
  recentTasks: ReadonlyArray<RecentTaskPattern>;
}

export interface ContextService {
  getProject(projectId: string): Promise<ProjectSummary>;
  getTasks(projectId: string): Promise<ReadonlyArray<any>>;
  getTeam(projectId: string): Promise<ReadonlyArray<TeamMemberSummary>>;
  getRecentHistory(
    projectId: string,
  ): Promise<ReadonlyArray<RecentTaskPattern>>;
}
