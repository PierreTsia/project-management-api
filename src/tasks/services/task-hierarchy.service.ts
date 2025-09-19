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

    return this.taskHierarchyRepository.save(hierarchy);
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

    return hierarchies.map((hierarchy) => {
      return new TaskHierarchyDto({
        id: hierarchy.id,
        projectId: hierarchy.projectId,
        parentTaskId: hierarchy.parentTaskId,
        childTaskId: hierarchy.childTaskId,
        createdAt: hierarchy.createdAt,
        ...(hierarchy.parentTask && {
          parentTask: new TaskResponseDto(hierarchy.parentTask),
        }),
      });
    });
  }

  async getChildrenForTask(taskId: string): Promise<TaskHierarchyDto[]> {
    const hierarchies = await this.taskHierarchyRepository.find({
      where: { parentTaskId: taskId },
      relations: ['childTask', 'childTask.assignee', 'childTask.project'],
    });

    return hierarchies.map((hierarchy) => {
      return new TaskHierarchyDto({
        id: hierarchy.id,
        projectId: hierarchy.projectId,
        parentTaskId: hierarchy.parentTaskId,
        childTaskId: hierarchy.childTaskId,
        createdAt: hierarchy.createdAt,
        ...(hierarchy.childTask && {
          childTask: new TaskResponseDto(hierarchy.childTask),
        }),
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
