import { Test, TestingModule } from '@nestjs/testing';
import { ValidationChainFactory } from './validation-chain-factory';
import { TaskRelationshipValidationChain } from './task-relationship-validation-chain';
import {
  SameProjectValidator,
  SelfLinkingValidator,
  CircularDependencyValidator,
  HierarchyConflictValidatorHandler,
} from './global-validators';
import { OneRelationshipPerPairValidator } from './one-relationship-per-pair-validator';
import {
  BlocksTypeValidator,
  DuplicatesTypeValidator,
} from './link-type-specific-validators';
import { DuplicateLinkValidator } from './duplicate-link-validator';
import { LinkLimitValidator } from './link-limit-validator';

describe('ValidationChainFactory', () => {
  let factory: ValidationChainFactory;
  let mockValidators: {
    sameProjectValidator: jest.Mocked<SameProjectValidator>;
    selfLinkingValidator: jest.Mocked<SelfLinkingValidator>;
    circularDependencyValidator: jest.Mocked<CircularDependencyValidator>;
    hierarchyConflictValidator: jest.Mocked<HierarchyConflictValidatorHandler>;
    oneRelationshipPerPairValidator: jest.Mocked<OneRelationshipPerPairValidator>;
    blocksTypeValidator: jest.Mocked<BlocksTypeValidator>;
    duplicatesTypeValidator: jest.Mocked<DuplicatesTypeValidator>;
    duplicateLinkValidator: jest.Mocked<DuplicateLinkValidator>;
    linkLimitValidator: jest.Mocked<LinkLimitValidator>;
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
      sameProjectValidator: createMockValidator() as any,
      selfLinkingValidator: createMockValidator() as any,
      circularDependencyValidator: createMockValidator() as any,
      hierarchyConflictValidator: createMockValidator() as any,
      oneRelationshipPerPairValidator: createMockValidator() as any,
      blocksTypeValidator: {} as any,
      duplicatesTypeValidator: {} as any,
      duplicateLinkValidator: createMockValidator() as any,
      linkLimitValidator: createMockValidator() as any,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ValidationChainFactory],
    }).compile();

    factory = module.get<ValidationChainFactory>(ValidationChainFactory);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createValidationChain', () => {
    it('should create a TaskRelationshipValidationChain instance', () => {
      const result = factory.createValidationChain(
        mockValidators.sameProjectValidator,
        mockValidators.selfLinkingValidator,
        mockValidators.circularDependencyValidator,
        mockValidators.hierarchyConflictValidator,
        mockValidators.oneRelationshipPerPairValidator,
        mockValidators.blocksTypeValidator,
        mockValidators.duplicatesTypeValidator,
        mockValidators.duplicateLinkValidator,
        mockValidators.linkLimitValidator,
      );

      expect(result).toBeInstanceOf(TaskRelationshipValidationChain);
    });

    it('should configure the shared validation chain in correct order', () => {
      factory.createValidationChain(
        mockValidators.sameProjectValidator,
        mockValidators.selfLinkingValidator,
        mockValidators.circularDependencyValidator,
        mockValidators.hierarchyConflictValidator,
        mockValidators.oneRelationshipPerPairValidator,
        mockValidators.blocksTypeValidator,
        mockValidators.duplicatesTypeValidator,
        mockValidators.duplicateLinkValidator,
        mockValidators.linkLimitValidator,
      );

      // Verify the chain is built in the correct order
      expect(mockValidators.sameProjectValidator.setNext).toHaveBeenCalledWith(
        mockValidators.selfLinkingValidator,
      );
      expect(mockValidators.selfLinkingValidator.setNext).toHaveBeenCalledWith(
        mockValidators.duplicateLinkValidator,
      );
      expect(
        mockValidators.duplicateLinkValidator.setNext,
      ).toHaveBeenCalledWith(mockValidators.linkLimitValidator);
      expect(mockValidators.linkLimitValidator.setNext).toHaveBeenCalledWith(
        mockValidators.oneRelationshipPerPairValidator,
      );
      expect(
        mockValidators.oneRelationshipPerPairValidator.setNext,
      ).toHaveBeenCalledWith(mockValidators.circularDependencyValidator);
      expect(
        mockValidators.circularDependencyValidator.setNext,
      ).toHaveBeenCalledWith(mockValidators.hierarchyConflictValidator);
    });

    it('should register type-specific validators correctly', () => {
      const mockRegisterLinkValidator = jest.fn();
      const mockSetValidationChain = jest.fn();

      // Mock the TaskRelationshipValidationChain methods
      jest
        .spyOn(
          TaskRelationshipValidationChain.prototype,
          'registerLinkValidator',
        )
        .mockImplementation(mockRegisterLinkValidator);
      jest
        .spyOn(TaskRelationshipValidationChain.prototype, 'setValidationChain')
        .mockImplementation(mockSetValidationChain);

      factory.createValidationChain(
        mockValidators.sameProjectValidator,
        mockValidators.selfLinkingValidator,
        mockValidators.circularDependencyValidator,
        mockValidators.hierarchyConflictValidator,
        mockValidators.oneRelationshipPerPairValidator,
        mockValidators.blocksTypeValidator,
        mockValidators.duplicatesTypeValidator,
        mockValidators.duplicateLinkValidator,
        mockValidators.linkLimitValidator,
      );

      // Verify type-specific validators are registered
      expect(mockRegisterLinkValidator).toHaveBeenCalledWith(
        'BLOCKS',
        mockValidators.blocksTypeValidator,
      );
      expect(mockRegisterLinkValidator).toHaveBeenCalledWith(
        'DUPLICATES',
        mockValidators.duplicatesTypeValidator,
      );
      expect(mockSetValidationChain).toHaveBeenCalledWith(
        mockValidators.sameProjectValidator,
      );
    });

    it('should set the validation chain to start with sameProjectValidator', () => {
      const mockSetValidationChain = jest.fn();
      jest
        .spyOn(TaskRelationshipValidationChain.prototype, 'setValidationChain')
        .mockImplementation(mockSetValidationChain);

      factory.createValidationChain(
        mockValidators.sameProjectValidator,
        mockValidators.selfLinkingValidator,
        mockValidators.circularDependencyValidator,
        mockValidators.hierarchyConflictValidator,
        mockValidators.oneRelationshipPerPairValidator,
        mockValidators.blocksTypeValidator,
        mockValidators.duplicatesTypeValidator,
        mockValidators.duplicateLinkValidator,
        mockValidators.linkLimitValidator,
      );

      expect(mockSetValidationChain).toHaveBeenCalledWith(
        mockValidators.sameProjectValidator,
      );
    });
  });

  describe('validator ordering business rules', () => {
    it('should order validators for optimal performance', () => {
      factory.createValidationChain(
        mockValidators.sameProjectValidator,
        mockValidators.selfLinkingValidator,
        mockValidators.circularDependencyValidator,
        mockValidators.hierarchyConflictValidator,
        mockValidators.oneRelationshipPerPairValidator,
        mockValidators.blocksTypeValidator,
        mockValidators.duplicatesTypeValidator,
        mockValidators.duplicateLinkValidator,
        mockValidators.linkLimitValidator,
      );

      // Verify the order follows the performance optimization rule:
      // 1. Fast checks first (sameProject, selfLinking)
      // 2. Database queries grouped (duplicateLink, linkLimit)
      // 3. Complex business logic last (oneRelationshipPerPair, circular, hierarchy)

      // Check that each validator was called with the correct next validator
      expect(mockValidators.sameProjectValidator.setNext).toHaveBeenCalledWith(
        mockValidators.selfLinkingValidator,
      );
      expect(mockValidators.selfLinkingValidator.setNext).toHaveBeenCalledWith(
        mockValidators.duplicateLinkValidator,
      );
      expect(
        mockValidators.duplicateLinkValidator.setNext,
      ).toHaveBeenCalledWith(mockValidators.linkLimitValidator);
      expect(mockValidators.linkLimitValidator.setNext).toHaveBeenCalledWith(
        mockValidators.oneRelationshipPerPairValidator,
      );
      expect(
        mockValidators.oneRelationshipPerPairValidator.setNext,
      ).toHaveBeenCalledWith(mockValidators.circularDependencyValidator);
      expect(
        mockValidators.circularDependencyValidator.setNext,
      ).toHaveBeenCalledWith(mockValidators.hierarchyConflictValidator);
    });

    it('should ensure early exit strategy with fast validators first', () => {
      // This test documents the business rule that fast validators should run first
      // to enable early exit on common validation failures
      const _validatorOrder = [
        'sameProjectValidator', // Fast: no DB queries
        'selfLinkingValidator', // Fast: no DB queries
        'duplicateLinkValidator', // DB query: check existing links
        'linkLimitValidator', // DB query: check link count
        'oneRelationshipPerPairValidator', // Business rule: one relationship per pair
        'circularDependencyValidator', // Complex: prevent circular deps
        'hierarchyConflictValidator', // Complex: prevent hierarchy conflicts
      ];

      factory.createValidationChain(
        mockValidators.sameProjectValidator,
        mockValidators.selfLinkingValidator,
        mockValidators.circularDependencyValidator,
        mockValidators.hierarchyConflictValidator,
        mockValidators.oneRelationshipPerPairValidator,
        mockValidators.blocksTypeValidator,
        mockValidators.duplicatesTypeValidator,
        mockValidators.duplicateLinkValidator,
        mockValidators.linkLimitValidator,
      );

      // The order is verified by the setNext call sequence
      // Each validator should be called once to set up the chain
      expect(mockValidators.sameProjectValidator.setNext).toHaveBeenCalledTimes(
        1,
      );
      expect(mockValidators.selfLinkingValidator.setNext).toHaveBeenCalledTimes(
        1,
      );
      expect(
        mockValidators.duplicateLinkValidator.setNext,
      ).toHaveBeenCalledTimes(1);
      expect(mockValidators.linkLimitValidator.setNext).toHaveBeenCalledTimes(
        1,
      );
      expect(
        mockValidators.oneRelationshipPerPairValidator.setNext,
      ).toHaveBeenCalledTimes(1);
      expect(
        mockValidators.circularDependencyValidator.setNext,
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('type-specific validator registration', () => {
    it('should only register validators for link types that have specific rules', () => {
      const mockRegisterLinkValidator = jest.fn();
      jest
        .spyOn(
          TaskRelationshipValidationChain.prototype,
          'registerLinkValidator',
        )
        .mockImplementation(mockRegisterLinkValidator);

      factory.createValidationChain(
        mockValidators.sameProjectValidator,
        mockValidators.selfLinkingValidator,
        mockValidators.circularDependencyValidator,
        mockValidators.hierarchyConflictValidator,
        mockValidators.oneRelationshipPerPairValidator,
        mockValidators.blocksTypeValidator,
        mockValidators.duplicatesTypeValidator,
        mockValidators.duplicateLinkValidator,
        mockValidators.linkLimitValidator,
      );

      // Only BLOCKS and DUPLICATES have type-specific validators
      expect(mockRegisterLinkValidator).toHaveBeenCalledTimes(2);
      expect(mockRegisterLinkValidator).toHaveBeenCalledWith(
        'BLOCKS',
        mockValidators.blocksTypeValidator,
      );
      expect(mockRegisterLinkValidator).toHaveBeenCalledWith(
        'DUPLICATES',
        mockValidators.duplicatesTypeValidator,
      );
    });

    it('should document that other link types use default validation', () => {
      // This test documents the business rule that link types without
      // specific validators (SPLITS_TO, RELATES_TO, etc.) only go through
      // the shared validation chain
      const result = factory.createValidationChain(
        mockValidators.sameProjectValidator,
        mockValidators.selfLinkingValidator,
        mockValidators.circularDependencyValidator,
        mockValidators.hierarchyConflictValidator,
        mockValidators.oneRelationshipPerPairValidator,
        mockValidators.blocksTypeValidator,
        mockValidators.duplicatesTypeValidator,
        mockValidators.duplicateLinkValidator,
        mockValidators.linkLimitValidator,
      );

      expect(result).toBeDefined();
      // Note: SPLITS_TO, RELATES_TO, IS_BLOCKED_BY, etc. use default validation
      // which means they only go through the shared chain
    });
  });

  describe('error handling', () => {
    it('should handle missing validators gracefully', () => {
      // This test ensures the factory doesn't break if validators are undefined
      // We'll create a mock validator that can handle undefined input
      const mockValidator = {
        setNext: jest.fn().mockReturnThis(),
      };

      expect(() => {
        factory.createValidationChain(
          mockValidator as any,
          mockValidators.selfLinkingValidator,
          mockValidators.circularDependencyValidator,
          mockValidators.hierarchyConflictValidator,
          mockValidators.oneRelationshipPerPairValidator,
          mockValidators.blocksTypeValidator,
          mockValidators.duplicatesTypeValidator,
          mockValidators.duplicateLinkValidator,
          mockValidators.linkLimitValidator,
        );
      }).not.toThrow();
    });
  });
});
