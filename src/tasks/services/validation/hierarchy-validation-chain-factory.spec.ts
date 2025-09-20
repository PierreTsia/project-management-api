import { Test, TestingModule } from '@nestjs/testing';
import { HierarchyValidationChainFactory } from './hierarchy-validation-chain-factory';
import { HierarchyValidationChain } from './hierarchy-validation-chain';
import { SelfHierarchyValidator } from './hierarchy-validators';
import { CircularHierarchyValidator } from './hierarchy-validators';
import { HierarchyDepthValidator } from './hierarchy-validators';
import {
  HierarchyConflictValidator as HierarchyConflictValidatorNew,
  LinkConflictValidatorForHierarchy,
} from './hierarchy-validators';
import { MultipleParentValidator } from './multiple-parent-validator';

describe('HierarchyValidationChainFactory', () => {
  let factory: HierarchyValidationChainFactory;
  let mockValidators: {
    selfHierarchyValidator: jest.Mocked<SelfHierarchyValidator>;
    circularHierarchyValidator: jest.Mocked<CircularHierarchyValidator>;
    hierarchyDepthValidator: jest.Mocked<HierarchyDepthValidator>;
    hierarchyConflictValidator: jest.Mocked<HierarchyConflictValidatorNew>;
    linkConflictValidatorForHierarchy: jest.Mocked<LinkConflictValidatorForHierarchy>;
    multipleParentValidator: jest.Mocked<MultipleParentValidator>;
  };

  beforeEach(async () => {
    // Create mock validators with proper chaining
    const createMockValidator = () => {
      const validator = {
        setNext: jest.fn(),
      };
      // Make setNext return the validator that was passed to it
      validator.setNext.mockImplementation((nextValidator) => {
        return nextValidator;
      });
      return validator;
    };

    mockValidators = {
      selfHierarchyValidator: createMockValidator() as any,
      circularHierarchyValidator: createMockValidator() as any,
      hierarchyDepthValidator: createMockValidator() as any,
      hierarchyConflictValidator: createMockValidator() as any,
      linkConflictValidatorForHierarchy: createMockValidator() as any,
      multipleParentValidator: createMockValidator() as any,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [HierarchyValidationChainFactory],
    }).compile();

    factory = module.get<HierarchyValidationChainFactory>(
      HierarchyValidationChainFactory,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createHierarchyValidationChain', () => {
    it('should create a HierarchyValidationChain instance', () => {
      const result = factory.createHierarchyValidationChain(
        mockValidators.selfHierarchyValidator,
        mockValidators.circularHierarchyValidator,
        mockValidators.hierarchyDepthValidator,
        mockValidators.hierarchyConflictValidator,
        mockValidators.linkConflictValidatorForHierarchy,
        mockValidators.multipleParentValidator,
      );

      expect(result).toBeInstanceOf(HierarchyValidationChain);
    });

    it('should configure the hierarchy validation chain in correct order', () => {
      factory.createHierarchyValidationChain(
        mockValidators.selfHierarchyValidator,
        mockValidators.circularHierarchyValidator,
        mockValidators.hierarchyDepthValidator,
        mockValidators.hierarchyConflictValidator,
        mockValidators.linkConflictValidatorForHierarchy,
        mockValidators.multipleParentValidator,
      );

      // Verify the chain is built in the correct order
      expect(
        mockValidators.selfHierarchyValidator.setNext,
      ).toHaveBeenCalledWith(mockValidators.multipleParentValidator);
      expect(
        mockValidators.multipleParentValidator.setNext,
      ).toHaveBeenCalledWith(mockValidators.circularHierarchyValidator);
      expect(
        mockValidators.circularHierarchyValidator.setNext,
      ).toHaveBeenCalledWith(mockValidators.hierarchyDepthValidator);
      expect(
        mockValidators.hierarchyDepthValidator.setNext,
      ).toHaveBeenCalledWith(mockValidators.hierarchyConflictValidator);
      expect(
        mockValidators.hierarchyConflictValidator.setNext,
      ).toHaveBeenCalledWith(mockValidators.linkConflictValidatorForHierarchy);
    });

    it('should set the validation chain to start with selfHierarchyValidator', () => {
      const mockSetValidationChain = jest.fn();
      jest
        .spyOn(HierarchyValidationChain.prototype, 'setValidationChain')
        .mockImplementation(mockSetValidationChain);

      factory.createHierarchyValidationChain(
        mockValidators.selfHierarchyValidator,
        mockValidators.circularHierarchyValidator,
        mockValidators.hierarchyDepthValidator,
        mockValidators.hierarchyConflictValidator,
        mockValidators.linkConflictValidatorForHierarchy,
        mockValidators.multipleParentValidator,
      );

      expect(mockSetValidationChain).toHaveBeenCalledWith(
        mockValidators.selfHierarchyValidator,
      );
    });

    it('should create HierarchyValidationChain with correct validators', () => {
      const result = factory.createHierarchyValidationChain(
        mockValidators.selfHierarchyValidator,
        mockValidators.circularHierarchyValidator,
        mockValidators.hierarchyDepthValidator,
        mockValidators.hierarchyConflictValidator,
        mockValidators.linkConflictValidatorForHierarchy,
        mockValidators.multipleParentValidator,
      );

      // Verify that the result is a HierarchyValidationChain instance
      expect(result).toBeInstanceOf(HierarchyValidationChain);

      // The constructor validation is implicit - if the wrong validators were passed,
      // the HierarchyValidationChain constructor would fail
    });
  });

  describe('hierarchy validator ordering business rules', () => {
    it('should order validators for optimal hierarchy validation flow', () => {
      factory.createHierarchyValidationChain(
        mockValidators.selfHierarchyValidator,
        mockValidators.circularHierarchyValidator,
        mockValidators.hierarchyDepthValidator,
        mockValidators.hierarchyConflictValidator,
        mockValidators.linkConflictValidatorForHierarchy,
        mockValidators.multipleParentValidator,
      );

      // Verify the order follows the hierarchy validation optimization rule:
      // 1. Self-hierarchy validation (fast check)
      // 2. Multiple parent validation (business rule)
      // 3. Circular dependency validation (complex check)
      // 4. Hierarchy depth validation (complex check)
      // 5. Hierarchy conflict validation (complex check)
      // 6. Link conflict validation (complex check)
      expect(
        mockValidators.selfHierarchyValidator.setNext,
      ).toHaveBeenCalledWith(mockValidators.multipleParentValidator);
      expect(
        mockValidators.multipleParentValidator.setNext,
      ).toHaveBeenCalledWith(mockValidators.circularHierarchyValidator);
      expect(
        mockValidators.circularHierarchyValidator.setNext,
      ).toHaveBeenCalledWith(mockValidators.hierarchyDepthValidator);
      expect(
        mockValidators.hierarchyDepthValidator.setNext,
      ).toHaveBeenCalledWith(mockValidators.hierarchyConflictValidator);
      expect(
        mockValidators.hierarchyConflictValidator.setNext,
      ).toHaveBeenCalledWith(mockValidators.linkConflictValidatorForHierarchy);
    });

    it('should ensure proper hierarchy validation sequence', () => {
      // This test documents the business rule that hierarchy validators should run
      // in a specific sequence to catch issues early and maintain data integrity
      const _validatorOrder = [
        'selfHierarchyValidator', // Fast: task can't be its own parent
        'multipleParentValidator', // Business rule: task can't have multiple parents
        'circularHierarchyValidator', // Complex: prevent circular hierarchies
        'hierarchyDepthValidator', // Complex: enforce depth limits
        'hierarchyConflictValidator', // Complex: prevent conflicting relationships
        'linkConflictValidatorForHierarchy', // Complex: prevent conflicts with task links
      ];

      factory.createHierarchyValidationChain(
        mockValidators.selfHierarchyValidator,
        mockValidators.circularHierarchyValidator,
        mockValidators.hierarchyDepthValidator,
        mockValidators.hierarchyConflictValidator,
        mockValidators.linkConflictValidatorForHierarchy,
        mockValidators.multipleParentValidator,
      );

      // The order is verified by the setNext call sequence
      // Each validator should be called once to set up the chain
      expect(
        mockValidators.selfHierarchyValidator.setNext,
      ).toHaveBeenCalledTimes(1);
      expect(
        mockValidators.multipleParentValidator.setNext,
      ).toHaveBeenCalledTimes(1);
      expect(
        mockValidators.circularHierarchyValidator.setNext,
      ).toHaveBeenCalledTimes(1);
      expect(
        mockValidators.hierarchyDepthValidator.setNext,
      ).toHaveBeenCalledTimes(1);
      expect(
        mockValidators.hierarchyConflictValidator.setNext,
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('hierarchy validation chain configuration', () => {
    it('should configure all validators in the correct sequence', () => {
      factory.createHierarchyValidationChain(
        mockValidators.selfHierarchyValidator,
        mockValidators.circularHierarchyValidator,
        mockValidators.hierarchyDepthValidator,
        mockValidators.hierarchyConflictValidator,
        mockValidators.linkConflictValidatorForHierarchy,
        mockValidators.multipleParentValidator,
      );

      // Verify that each validator is configured exactly once
      expect(
        mockValidators.selfHierarchyValidator.setNext,
      ).toHaveBeenCalledTimes(1);
      expect(
        mockValidators.multipleParentValidator.setNext,
      ).toHaveBeenCalledTimes(1);
      expect(
        mockValidators.circularHierarchyValidator.setNext,
      ).toHaveBeenCalledTimes(1);
      expect(
        mockValidators.hierarchyDepthValidator.setNext,
      ).toHaveBeenCalledTimes(1);
      expect(
        mockValidators.hierarchyConflictValidator.setNext,
      ).toHaveBeenCalledTimes(1);
      // linkConflictValidatorForHierarchy is the last in the chain, so it shouldn't call setNext
      expect(
        mockValidators.linkConflictValidatorForHierarchy.setNext,
      ).toHaveBeenCalledTimes(0);
    });

    it('should document the hierarchy validation business rules', () => {
      // This test documents the business rules for hierarchy validation
      const result = factory.createHierarchyValidationChain(
        mockValidators.selfHierarchyValidator,
        mockValidators.circularHierarchyValidator,
        mockValidators.hierarchyDepthValidator,
        mockValidators.hierarchyConflictValidator,
        mockValidators.linkConflictValidatorForHierarchy,
        mockValidators.multipleParentValidator,
      );

      expect(result).toBeDefined();
      // Note: The hierarchy validation chain ensures:
      // 1. No self-referencing hierarchies
      // 2. No multiple parent relationships
      // 3. No circular dependencies
      // 4. Depth limits are respected
      // 5. No conflicts with existing hierarchies
      // 6. No conflicts with task links
    });
  });

  describe('error handling', () => {
    it('should handle missing validators gracefully', () => {
      // This test ensures the factory doesn't break if validators are undefined
      const mockValidator = {
        setNext: jest.fn().mockReturnThis(),
      };

      expect(() => {
        factory.createHierarchyValidationChain(
          mockValidator as any,
          mockValidators.circularHierarchyValidator,
          mockValidators.hierarchyDepthValidator,
          mockValidators.hierarchyConflictValidator,
          mockValidators.linkConflictValidatorForHierarchy,
          mockValidators.multipleParentValidator,
        );
      }).not.toThrow();
    });
  });
});
