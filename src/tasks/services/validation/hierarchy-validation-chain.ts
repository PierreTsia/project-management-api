import { Injectable } from '@nestjs/common';
import {
  HierarchyValidationRequest,
  ValidationResult,
} from './hierarchy-validators';
import {
  SelfHierarchyValidator,
  CircularHierarchyValidator,
  HierarchyDepthValidator,
  HierarchyConflictValidator,
  LinkConflictValidatorForHierarchy,
} from './hierarchy-validators';

@Injectable()
export class HierarchyValidationChain {
  private validationChain: SelfHierarchyValidator | undefined;

  constructor(
    private readonly selfHierarchyValidator: SelfHierarchyValidator,
    private readonly circularHierarchyValidator: CircularHierarchyValidator,
    private readonly hierarchyDepthValidator: HierarchyDepthValidator,
    private readonly hierarchyConflictValidator: HierarchyConflictValidator,
    private readonly linkConflictValidatorForHierarchy: LinkConflictValidatorForHierarchy,
  ) {}

  setValidationChain(first: SelfHierarchyValidator): void {
    this.validationChain = first;
  }

  async validateHierarchy(
    request: HierarchyValidationRequest,
  ): Promise<ValidationResult> {
    return this.validationChain?.handle(request) ?? { valid: true };
  }
}
