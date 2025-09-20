import { Injectable } from '@nestjs/common';
import { TaskRelationshipValidationChain } from './task-relationship-validation-chain';
import {
  SameProjectValidator,
  SelfLinkingValidator,
  CircularDependencyValidator,
  HierarchyConflictValidatorHandler,
} from './global-validators';
import { OneRelationshipPerPairValidator } from './one-relationship-per-pair-validator';
import { BlocksTypeValidator } from './link-type-specific-validators';
import { DuplicatesTypeValidator } from './link-type-specific-validators';
import { DuplicateLinkValidator } from './duplicate-link-validator';
import { LinkLimitValidator } from './link-limit-validator';

/**
 * Factory responsible for creating and configuring the task relationship validation chain.
 * This class encapsulates the business logic for validator ordering and configuration,
 * making it testable and maintainable.
 */
@Injectable()
export class ValidationChainFactory {
  /**
   * Creates a fully configured TaskRelationshipValidationChain with all validators
   * properly ordered and registered.
   *
   * Validator order is critical for performance and logic:
   * 1. Fast checks first (no database queries)
   * 2. Database queries grouped together
   * 3. Complex business logic last
   * 4. Early exit on failures
   */
  createValidationChain(
    sameProjectValidator: SameProjectValidator,
    selfLinkingValidator: SelfLinkingValidator,
    circularDependencyValidator: CircularDependencyValidator,
    hierarchyConflictValidator: HierarchyConflictValidatorHandler,
    oneRelationshipPerPairValidator: OneRelationshipPerPairValidator,
    blocksTypeValidator: BlocksTypeValidator,
    duplicatesTypeValidator: DuplicatesTypeValidator,
    duplicateLinkValidator: DuplicateLinkValidator,
    linkLimitValidator: LinkLimitValidator,
  ): TaskRelationshipValidationChain {
    // Configure the shared validation chain
    // Order matters: fast checks first, then database queries, then complex logic
    this.configureSharedChain(
      sameProjectValidator,
      selfLinkingValidator,
      duplicateLinkValidator,
      linkLimitValidator,
      oneRelationshipPerPairValidator,
      circularDependencyValidator,
      hierarchyConflictValidator,
    );

    // Create the main validation chain
    const relationshipValidator = new TaskRelationshipValidationChain();
    relationshipValidator.setValidationChain(sameProjectValidator);

    // Register type-specific validators
    this.registerTypeSpecificValidators(
      relationshipValidator,
      blocksTypeValidator,
      duplicatesTypeValidator,
    );

    return relationshipValidator;
  }

  /**
   * Configures the shared validation chain with proper ordering.
   * This method encapsulates the business rule for validator ordering.
   */
  private configureSharedChain(
    sameProjectValidator: SameProjectValidator,
    selfLinkingValidator: SelfLinkingValidator,
    duplicateLinkValidator: DuplicateLinkValidator,
    linkLimitValidator: LinkLimitValidator,
    oneRelationshipPerPairValidator: OneRelationshipPerPairValidator,
    circularDependencyValidator: CircularDependencyValidator,
    hierarchyConflictValidator: HierarchyConflictValidatorHandler,
  ): void {
    sameProjectValidator
      .setNext(selfLinkingValidator)
      .setNext(duplicateLinkValidator)
      .setNext(linkLimitValidator)
      .setNext(oneRelationshipPerPairValidator)
      .setNext(circularDependencyValidator)
      .setNext(hierarchyConflictValidator);
  }

  /**
   * Registers type-specific validation strategies.
   * Each link type can have additional validation rules beyond the shared chain.
   */
  private registerTypeSpecificValidators(
    relationshipValidator: TaskRelationshipValidationChain,
    blocksTypeValidator: BlocksTypeValidator,
    duplicatesTypeValidator: DuplicatesTypeValidator,
  ): void {
    relationshipValidator.registerLinkValidator('BLOCKS', blocksTypeValidator);
    relationshipValidator.registerLinkValidator(
      'DUPLICATES',
      duplicatesTypeValidator,
    );
    // Note: Other link types (SPLITS_TO, RELATES_TO, etc.) use default validation
    // which means they only go through the shared chain
  }
}
