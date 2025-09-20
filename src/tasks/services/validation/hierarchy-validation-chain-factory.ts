import { Injectable } from '@nestjs/common';
import { HierarchyValidationChain } from './hierarchy-validation-chain';
import { SelfHierarchyValidator } from './hierarchy-validators';
import { CircularHierarchyValidator } from './hierarchy-validators';
import { HierarchyDepthValidator } from './hierarchy-validators';
import {
  HierarchyConflictValidator as HierarchyConflictValidatorNew,
  LinkConflictValidatorForHierarchy,
} from './hierarchy-validators';
import { MultipleParentValidator } from './multiple-parent-validator';

/**
 * Factory responsible for creating and configuring the hierarchy validation chain.
 * This class encapsulates the business logic for hierarchy validator ordering and configuration,
 * making it testable and maintainable.
 */
@Injectable()
export class HierarchyValidationChainFactory {
  /**
   * Creates a fully configured HierarchyValidationChain with all validators
   * properly ordered and registered.
   *
   * Hierarchy validator order is critical for logic flow:
   * 1. Self-hierarchy validation (task can't be its own parent)
   * 2. Multiple parent validation (task can't have multiple parents)
   * 3. Circular dependency validation (prevent circular hierarchies)
   * 4. Hierarchy depth validation (enforce depth limits)
   * 5. Hierarchy conflict validation (prevent conflicting relationships)
   * 6. Link conflict validation (prevent conflicts with task links)
   */
  createHierarchyValidationChain(
    selfHierarchyValidator: SelfHierarchyValidator,
    circularHierarchyValidator: CircularHierarchyValidator,
    hierarchyDepthValidator: HierarchyDepthValidator,
    hierarchyConflictValidator: HierarchyConflictValidatorNew,
    linkConflictValidatorForHierarchy: LinkConflictValidatorForHierarchy,
    multipleParentValidator: MultipleParentValidator,
  ): HierarchyValidationChain {
    // Configure the hierarchy validation chain
    this.configureHierarchyChain(
      selfHierarchyValidator,
      multipleParentValidator,
      circularHierarchyValidator,
      hierarchyDepthValidator,
      hierarchyConflictValidator,
      linkConflictValidatorForHierarchy,
    );

    // Create the hierarchy validation chain
    const hierarchyValidationChain = new HierarchyValidationChain(
      selfHierarchyValidator,
      circularHierarchyValidator,
      hierarchyDepthValidator,
      hierarchyConflictValidator,
      linkConflictValidatorForHierarchy,
    );

    hierarchyValidationChain.setValidationChain(selfHierarchyValidator);
    return hierarchyValidationChain;
  }

  /**
   * Configures the hierarchy validation chain with proper ordering.
   * This method encapsulates the business rule for hierarchy validator ordering.
   */
  private configureHierarchyChain(
    selfHierarchyValidator: SelfHierarchyValidator,
    multipleParentValidator: MultipleParentValidator,
    circularHierarchyValidator: CircularHierarchyValidator,
    hierarchyDepthValidator: HierarchyDepthValidator,
    hierarchyConflictValidator: HierarchyConflictValidatorNew,
    linkConflictValidatorForHierarchy: LinkConflictValidatorForHierarchy,
  ): void {
    selfHierarchyValidator
      .setNext(multipleParentValidator)
      .setNext(circularHierarchyValidator)
      .setNext(hierarchyDepthValidator)
      .setNext(hierarchyConflictValidator)
      .setNext(linkConflictValidatorForHierarchy);
  }
}
