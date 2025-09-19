import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskHierarchy } from '../entities/task-hierarchy.entity';
import { Task } from '../entities/task.entity';
import { I18nService } from 'nestjs-i18n';
import { CustomLogger } from '../../common/services/logger.service';
import { CreateTaskHierarchyDto } from '../dto/create-task-hierarchy.dto';
import { TaskHierarchyDto } from '../dto/task-hierarchy.dto';
import { HierarchyTreeDto } from '../dto/hierarchy-tree.dto';
import { TaskResponseDto } from '../dto/task-response.dto';
import { HierarchyValidationChain } from './validation/hierarchy-validation-chain';
import { TaskLinkService } from './task-link.service';

@Injectable()
export class TaskHierarchyService {
  constructor(
    @InjectRepository(TaskHierarchy)
    private readonly taskHierarchyRepository: Repository<TaskHierarchy>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly i18n: I18nService,
    private readonly logger: CustomLogger,
    private readonly hierarchyValidationChain: HierarchyValidationChain,
    private readonly taskLinkService: TaskLinkService,
  ) {
    this.logger.setContext(TaskHierarchyService.name);
  }

  async createHierarchy(
    input: CreateTaskHierarchyDto,
    acceptLanguage?: string,
  ): Promise<TaskHierarchy> {
    this.logger.log(
      `Creating hierarchy: parent=${input.parentTaskId}, child=${input.childTaskId} in project=${input.projectId}`,
    );

    // Load tasks for validation
    const [parentTask, childTask] = await Promise.all([
      this.taskRepository.findOne({
        where: { id: input.parentTaskId, projectId: input.projectId },
      }),
      this.taskRepository.findOne({
        where: { id: input.childTaskId, projectId: input.projectId },
      }),
    ]);

    if (!parentTask) {
      throw new NotFoundException(
        this.i18n.t('errors.tasks.task_not_found', {
          args: { id: input.parentTaskId, projectId: input.projectId },
          lang: acceptLanguage,
        }),
      );
    }

    if (!childTask) {
      throw new NotFoundException(
        this.i18n.t('errors.tasks.task_not_found', {
          args: { id: input.childTaskId, projectId: input.projectId },
          lang: acceptLanguage,
        }),
      );
    }

    // Validate hierarchy creation
    const validation = await this.hierarchyValidationChain.validateHierarchy({
      parentTask,
      childTask,
      projectId: input.projectId,
    });

    if (!validation.valid) {
      throw new BadRequestException(
        this.i18n.t(validation.reason || 'errors.task_hierarchy.invalid', {
          lang: acceptLanguage,
        }),
      );
    }

    // Create hierarchy relationship
    const hierarchy = this.taskHierarchyRepository.create({
      projectId: input.projectId,
      parentTaskId: input.parentTaskId,
      childTaskId: input.childTaskId,
    });

    const savedHierarchy = await this.taskHierarchyRepository.save(hierarchy);

    this.logger.log(
      `Hierarchy created successfully: ${savedHierarchy.id} (parent=${savedHierarchy.parentTaskId}, child=${savedHierarchy.childTaskId})`,
    );

    return savedHierarchy;
  }

  async deleteHierarchy(
    projectId: string,
    parentTaskId: string,
    childTaskId: string,
    acceptLanguage?: string,
  ): Promise<void> {
    this.logger.log(
      `Deleting hierarchy: parent=${parentTaskId}, child=${childTaskId} in project=${projectId}`,
    );

    const result = await this.taskHierarchyRepository.delete({
      projectId,
      parentTaskId,
      childTaskId,
    });

    if (result.affected === 0) {
      throw new NotFoundException(
        this.i18n.t('errors.task_hierarchy.not_found', {
          lang: acceptLanguage,
        }),
      );
    }

    this.logger.log(
      `Hierarchy deleted successfully: parent=${parentTaskId}, child=${childTaskId}`,
    );
  }

  async getHierarchyForTask(taskId: string): Promise<HierarchyTreeDto> {
    const [parents, children] = await Promise.all([
      this.getParentsForTask(taskId),
      this.getChildrenForTask(taskId),
    ]);

    return new HierarchyTreeDto({
      parents,
      children,
    });
  }

  async getParentsForTask(taskId: string): Promise<TaskHierarchyDto[]> {
    const hierarchies = await this.taskHierarchyRepository.find({
      where: { childTaskId: taskId },
      relations: ['parentTask', 'parentTask.assignee', 'parentTask.project'],
    });

    if (hierarchies.length === 0) {
      return [];
    }

    // Extract parent task IDs for batch link fetching
    const parentTaskIds = hierarchies
      .map((h) => h.parentTask?.id)
      .filter((id): id is string => id !== undefined);

    // Batch fetch all links for parent tasks
    const linksByTaskId =
      await this.taskLinkService.batchListLinksWithTasks(parentTaskIds);

    return hierarchies.map((hierarchy) => {
      let parentTaskDto: TaskResponseDto | undefined;

      if (hierarchy.parentTask) {
        // Get links from the batch-fetched data
        const links = linksByTaskId.get(hierarchy.parentTask.id) || [];
        parentTaskDto = new TaskResponseDto(hierarchy.parentTask, links);
      }

      return new TaskHierarchyDto({
        id: hierarchy.id,
        projectId: hierarchy.projectId,
        parentTaskId: hierarchy.parentTaskId,
        childTaskId: hierarchy.childTaskId,
        createdAt: hierarchy.createdAt,
        ...(parentTaskDto && { parentTask: parentTaskDto }),
      });
    });
  }

  async getChildrenForTask(taskId: string): Promise<TaskHierarchyDto[]> {
    const hierarchies = await this.taskHierarchyRepository.find({
      where: { parentTaskId: taskId },
      relations: ['childTask', 'childTask.assignee', 'childTask.project'],
    });

    if (hierarchies.length === 0) {
      return [];
    }

    // Extract child task IDs for batch link fetching
    const childTaskIds = hierarchies
      .map((h) => h.childTask?.id)
      .filter((id): id is string => id !== undefined);

    // Batch fetch all links for child tasks
    const linksByTaskId =
      await this.taskLinkService.batchListLinksWithTasks(childTaskIds);

    return hierarchies.map((hierarchy) => {
      let childTaskDto: TaskResponseDto | undefined;

      if (hierarchy.childTask) {
        // Get links from the batch-fetched data
        const links = linksByTaskId.get(hierarchy.childTask.id) || [];
        childTaskDto = new TaskResponseDto(hierarchy.childTask, links);
      }

      return new TaskHierarchyDto({
        id: hierarchy.id,
        projectId: hierarchy.projectId,
        parentTaskId: hierarchy.parentTaskId,
        childTaskId: hierarchy.childTaskId,
        createdAt: hierarchy.createdAt,
        ...(childTaskDto && { childTask: childTaskDto }),
      });
    });
  }

  async getAllParentsForTask(taskId: string): Promise<TaskHierarchyDto[]> {
    // Recursively get all parents up to the root
    const allParents: TaskHierarchyDto[] = [];
    const visited = new Set<string>();

    const collectParents = async (currentTaskId: string) => {
      if (visited.has(currentTaskId)) return;
      visited.add(currentTaskId);

      const parents = await this.getParentsForTask(currentTaskId);
      allParents.push(...parents);

      // Recursively get parents of parents
      for (const parent of parents) {
        await collectParents(parent.parentTaskId);
      }
    };

    await collectParents(taskId);
    return allParents;
  }

  async getAllChildrenForTask(taskId: string): Promise<TaskHierarchyDto[]> {
    // Recursively get all children down to the leaves
    const allChildren: TaskHierarchyDto[] = [];
    const visited = new Set<string>();

    const collectChildren = async (currentTaskId: string) => {
      if (visited.has(currentTaskId)) return;
      visited.add(currentTaskId);

      const children = await this.getChildrenForTask(currentTaskId);
      allChildren.push(...children);

      // Recursively get children of children
      for (const child of children) {
        await collectChildren(child.childTaskId);
      }
    };

    await collectChildren(taskId);
    return allChildren;
  }
}
