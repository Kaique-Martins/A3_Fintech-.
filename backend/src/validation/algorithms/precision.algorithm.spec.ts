import { PrecisionAlgorithms } from './precision.algorithm';

describe('PrecisionAlgorithms', () => {
  describe('levenshteinDistance', () => {
    it('should return 0 for identical strings', () => {
      const result = PrecisionAlgorithms.levenshteinDistance('abc', 'abc');
      expect(result).toBe(0);
    });

    it('should return correct distance for different strings', () => {
      const result = PrecisionAlgorithms.levenshteinDistance('kitten', 'sitting');
      expect(result).toBe(3);
    });

    it('should handle empty strings', () => {
      expect(PrecisionAlgorithms.levenshteinDistance('', 'abc')).toBe(3);
      expect(PrecisionAlgorithms.levenshteinDistance('abc', '')).toBe(3);
      expect(PrecisionAlgorithms.levenshteinDistance('', '')).toBe(0);
    });

    it('should be case-sensitive', () => {
      const result = PrecisionAlgorithms.levenshteinDistance('ABC', 'abc');
      expect(result).toBe(3);
    });
  });

  describe('similarity', () => {
    it('should return 100 for identical strings', () => {
      const result = PrecisionAlgorithms.similarity('abc', 'abc');
      expect(result).toBe(100);
    });

    it('should return 0 for completely different long strings', () => {
      const result = PrecisionAlgorithms.similarity('xyz', 'abc');
      expect(result).toBeLessThan(50);
    });

    it('should return 100 for empty strings', () => {
      const result = PrecisionAlgorithms.similarity('', '');
      expect(result).toBe(100);
    });

    it('should be symmetric', () => {
      const sim1 = PrecisionAlgorithms.similarity('hello', 'hallo');
      const sim2 = PrecisionAlgorithms.similarity('hallo', 'hello');
      expect(sim1).toBe(sim2);
    });

    it('should calculate similarity >= 0 and <= 100', () => {
      const result = PrecisionAlgorithms.similarity('Javascript', 'Java');
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });
  });

  describe('detectOutliers', () => {
    it('should return no outliers for small arrays', () => {
      const result = PrecisionAlgorithms.detectOutliers([1, 2, 3]);
      expect(result.outliers).toHaveLength(0);
    });

    it('should detect outliers in normal distribution', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 100];
      const result = PrecisionAlgorithms.detectOutliers(values);
      expect(result.outliers).toContain(100);
    });

    it('should provide isOutlier function', () => {
      const values = [1, 2, 3, 4, 5];
      const result = PrecisionAlgorithms.detectOutliers(values);
      expect(typeof result.isOutlier).toBe('function');
    });

    it('should identify multiple outliers', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 100, 200];
      const result = PrecisionAlgorithms.detectOutliers(values);
      expect(result.outliers.length).toBeGreaterThan(0);
    });
  });

  describe('calculateZScore', () => {
    it('should return 0 when standard deviation is 0', () => {
      const result = PrecisionAlgorithms.calculateZScore(5, 5, 0);
      expect(result).toBe(0);
    });

    it('should calculate correct z-score', () => {
      const result = PrecisionAlgorithms.calculateZScore(10, 5, 5);
      expect(result).toBe(1);
    });

    it('should return absolute value', () => {
      const result = PrecisionAlgorithms.calculateZScore(0, 5, 5);
      expect(result).toBe(1);
    });
  });

  describe('mean', () => {
    it('should calculate mean correctly', () => {
      const result = PrecisionAlgorithms.mean([1, 2, 3, 4, 5]);
      expect(result).toBe(3);
    });

    it('should return 0 for empty array', () => {
      const result = PrecisionAlgorithms.mean([]);
      expect(result).toBe(0);
    });

    it('should handle single value', () => {
      const result = PrecisionAlgorithms.mean([5]);
      expect(result).toBe(5);
    });

    it('should handle negative numbers', () => {
      const result = PrecisionAlgorithms.mean([-2, 0, 2]);
      expect(result).toBe(0);
    });
  });

  describe('stdDev', () => {
    it('should calculate standard deviation correctly', () => {
      const result = PrecisionAlgorithms.stdDev([1, 2, 3, 4, 5]);
      expect(result).toBeCloseTo(1.414213562, 5);
    });

    it('should return 0 for identical values', () => {
      const result = PrecisionAlgorithms.stdDev([5, 5, 5, 5]);
      expect(result).toBe(0);
    });

    it('should return 0 for single value', () => {
      const result = PrecisionAlgorithms.stdDev([5]);
      expect(result).toBe(0);
    });
  });

  describe('matchesPattern', () => {
    it('should match valid patterns', () => {
      const result = PrecisionAlgorithms.matchesPattern('test@example.com', /^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(result).toBe(true);
    });

    it('should not match invalid patterns', () => {
      const result = PrecisionAlgorithms.matchesPattern('invalid-email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(result).toBe(false);
    });
  });

  describe('hasInvalidCharacters', () => {
    it('should detect invalid control characters', () => {
      const result = PrecisionAlgorithms.hasInvalidCharacters('test\x00value');
      expect(result).toBe(true);
    });

    it('should not flag normal strings', () => {
      const result = PrecisionAlgorithms.hasInvalidCharacters('normal string');
      expect(result).toBe(false);
    });

    it('should allow special characters like punctuation', () => {
      const result = PrecisionAlgorithms.hasInvalidCharacters('test-value_123');
      expect(result).toBe(false);
    });
  });

  describe('stringQualityScore', () => {
    it('should return 0 for empty string', () => {
      const result = PrecisionAlgorithms.stringQualityScore('');
      expect(result).toBe(0);
    });

    it('should return 0 for whitespace only', () => {
      const result = PrecisionAlgorithms.stringQualityScore('   ');
      expect(result).toBe(0);
    });

    it('should calculate quality for normal string', () => {
      const result = PrecisionAlgorithms.stringQualityScore('Normal Product');
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });

    it('should penalize multiple spaces', () => {
      const normalScore = PrecisionAlgorithms.stringQualityScore('Normal Product');
      const spaceScore = PrecisionAlgorithms.stringQualityScore('Normal  Product');
      expect(spaceScore).toBeLessThan(normalScore);
    });

    it('should be between 0-100', () => {
      const examples = ['test', 'Very Long Product Name With Many Details', 'ABC123XYZ456'];
      examples.forEach((ex) => {
        const score = PrecisionAlgorithms.stringQualityScore(ex);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('findDuplicates', () => {
    it('should find identical duplicates', () => {
      const items = ['apple', 'banana', 'apple'];
      const result = PrecisionAlgorithms.findDuplicates(items, 100);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should find similar items with fuzzy matching', () => {
      const items = ['iphone', 'iPhone', 'IPHONE'];
      const result = PrecisionAlgorithms.findDuplicates(items, 90);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return empty for unique items', () => {
      const items = ['apple', 'banana', 'cherry'];
      const result = PrecisionAlgorithms.findDuplicates(items, 95);
      expect(result.length).toBe(0);
    });

    it('should respect threshold parameter', () => {
      const items = ['test1', 'test2', 'test3'];
      const strictResult = PrecisionAlgorithms.findDuplicates(items, 99);
      const lenientResult = PrecisionAlgorithms.findDuplicates(items, 50);
      expect(strictResult.length).toBeLessThanOrEqual(lenientResult.length);
    });
  });
});
