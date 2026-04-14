import { AdvancedBusinessRules, ValidationAlert } from './business-rules';

describe('AdvancedBusinessRules', () => {
  describe('isSuspiciousProductName', () => {
    it('should alert on product name too short', () => {
      const result = AdvancedBusinessRules.isSuspiciousProductName('AB');
      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('PRODUCT_TOO_GENERIC');
      expect(result[0].severity).toBe('ALTO');
    });

    it('should not alert on normal product name', () => {
      const result = AdvancedBusinessRules.isSuspiciousProductName('Normal Product Name');
      expect(result.length).toBe(0);
    });

    it('should alert on known counterfeit brands', () => {
      const brands = ['iphone', 'airpods', 'rolex', 'prada', 'gucci'];
      brands.forEach((brand) => {
        const result = AdvancedBusinessRules.isSuspiciousProductName(`Fake ${brand}`);
        const hasFakeAlert = result.some((a) => a.code === 'HIGH_COUNTERFEIT_RISK');
        expect(hasFakeAlert).toBe(true);
      });
    });

    it('should alert on excessive numbers in product name', () => {
      const result = AdvancedBusinessRules.isSuspiciousProductName('Product 12345678901234');
      const hasNumbersAlert = result.some((a) => a.code === 'EXCESSIVE_NUMBERS');
      expect(hasNumbersAlert).toBe(true);
    });

    it('should be case-insensitive for brand detection', () => {
      const result = AdvancedBusinessRules.isSuspiciousProductName('IPHONE XS');
      const hasFakeAlert = result.some((a) => a.code === 'HIGH_COUNTERFEIT_RISK');
      expect(hasFakeAlert).toBe(true);
    });

    it('should return ValidationAlert array', () => {
      const result = AdvancedBusinessRules.isSuspiciousProductName('AB');
      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('severity');
        expect(result[0]).toHaveProperty('code');
        expect(result[0]).toHaveProperty('message');
        expect(result[0]).toHaveProperty('field');
      }
    });
  });

  describe('analyzePriceAnomaly', () => {
    it('should reject negative prices', () => {
      const result = AdvancedBusinessRules.analyzePriceAnomaly(-10, 'Eletrônicos');
      expect(result.isValid).toBe(false);
      expect(result.quality).toBe(0);
      expect(result.confidence).toBeLessThan(10);
    });

    it('should reject zero price', () => {
      const result = AdvancedBusinessRules.analyzePriceAnomaly(0, 'Eletrônicos');
      expect(result.isValid).toBe(false);
    });

    it('should accept valid price for category', () => {
      const result = AdvancedBusinessRules.analyzePriceAnomaly(1000, 'Eletrônicos');
      expect(result.isValid).toBe(true);
      expect(result.alerts.length).toBe(0);
    });

    it('should alert on price below minimum for category', () => {
      const result = AdvancedBusinessRules.analyzePriceAnomaly(5, 'Eletrônicos');
      expect(result.isValid).toBe(false);
      const hasAlert = result.alerts.some((a) => a.code === 'PRICE_BELOW_MIN');
      expect(hasAlert).toBe(true);
    });

    it('should alert on extremely high price (>10x max)', () => {
      const result = AdvancedBusinessRules.analyzePriceAnomaly(600000, 'Eletrônicos');
      const hasAlert = result.alerts.some((a) => a.code === 'PRICE_EXTREME_HIGH');
      expect(hasAlert).toBe(true);
      expect(result.alerts.some((a) => a.severity === 'CRÍTICO')).toBe(true);
    });

    it('should alert on moderately high price (2-10x max)', () => {
      const result = AdvancedBusinessRules.analyzePriceAnomaly(100000, 'Eletrônicos');
      const hasAlert = result.alerts.some((a) => a.code === 'PRICE_ABOVE_NORMAL');
      expect(hasAlert).toBe(true);
    });

    it('should detect statistical outliers with allPrices', () => {
      const prices = [100, 105, 110, 95, 102, 108, 103, 107];
      const result = AdvancedBusinessRules.analyzePriceAnomaly(500, 'Vestuário', prices);
      const hasAlert = result.alerts.some((a) => a.code === 'STATISTICAL_OUTLIER');
      expect(hasAlert).toBe(true);
    });

    it('should return ValueAnalysis interface', () => {
      const result = AdvancedBusinessRules.analyzePriceAnomaly(150, 'Vestuário');
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('quality');
      expect(result).toHaveProperty('alerts');
      expect(result).toHaveProperty('confidence');
      expect(typeof result.quality).toBe('number');
      expect(typeof result.confidence).toBe('number');
    });

    it('should have quality between 0-100', () => {
      const prices = [100, 200, 300, 400];
      [50, 150, 5000, -100].forEach((price) => {
        const result = AdvancedBusinessRules.analyzePriceAnomaly(price, 'Vestuário');
        if (price > 0) {
          expect(result.quality).toBeGreaterThanOrEqual(0);
          expect(result.quality).toBeLessThanOrEqual(100);
        }
      });
    });

    it('should respect category rules', () => {
      const alimentoResult = AdvancedBusinessRules.analyzePriceAnomaly(3000, 'Alimentos');
      const electroResult = AdvancedBusinessRules.analyzePriceAnomaly(3000, 'Eletrônicos');
      // Same price (3000): valid for Eletrônicos (15-500000), invalid for Alimentos (0.5-2000)
      expect(alimentoResult.isValid).toBe(false);
      expect(electroResult.isValid).toBe(true);
    });
  });

  describe('validateFieldConsistency', () => {
    it('should alert on product-category mismatch', () => {
      const result = AdvancedBusinessRules.validateFieldConsistency({
        produto: 'Notebook Dell',
        categoria: 'Alimentos',
      });
      const hasMismatch = result.some((a) => a.code === 'PRODUCT_CATEGORY_MISMATCH');
      expect(hasMismatch).toBe(true);
    });

    it('should not alert on matching product-category', () => {
      const result = AdvancedBusinessRules.validateFieldConsistency({
        produto: 'Arroz integral 5kg',
        categoria: 'Alimentos',
      });
      const hasMismatch = result.some((a) => a.code === 'PRODUCT_CATEGORY_MISMATCH');
      expect(hasMismatch).toBe(false);
    });

    it('should alert on very long city names', () => {
      const result = AdvancedBusinessRules.validateFieldConsistency({
        cidade: 'A'.repeat(35),
      });
      const hasAlert = result.some((a) => a.code === 'CITY_NAME_TOO_LONG');
      expect(hasAlert).toBe(true);
    });

    it('should not alert on normal city names', () => {
      const result = AdvancedBusinessRules.validateFieldConsistency({
        cidade: 'São Paulo',
      });
      const hasAlert = result.some((a) => a.code === 'CITY_NAME_TOO_LONG');
      expect(hasAlert).toBe(false);
    });

    it('should handle empty data', () => {
      const result = AdvancedBusinessRules.validateFieldConsistency({});
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('calculateDataQualityScore', () => {
    it('should return 100 for complete valid data', () => {
      const data = {
        produto: 'Product Name',
        categoria: 'Eletrônicos',
        preco: 1000,
        cidade: 'São Paulo',
      };
      const score = AdvancedBusinessRules.calculateDataQualityScore(data, []);
      expect(score).toBe(100);
    });

    it('should penalize missing fields', () => {
      const fullScore = AdvancedBusinessRules.calculateDataQualityScore(
        {
          produto: 'Product',
          categoria: 'Category',
          preco: 100,
          cidade: 'City',
        },
        [],
      );

      const missingProduto = AdvancedBusinessRules.calculateDataQualityScore(
        {
          categoria: 'Category',
          preco: 100,
          cidade: 'City',
        },
        [],
      );

      expect(missingProduto).toBeLessThan(fullScore);
    });

    it('should penalize alerts', () => {
      const data = {
        produto: 'Product',
        categoria: 'Category',
        preco: 100,
        cidade: 'City',
      };

      const noAlerts = AdvancedBusinessRules.calculateDataQualityScore(data, []);

      const withCriticAlert: ValidationAlert[] = [
        {
          severity: 'CRÍTICO',
          code: 'TEST',
          message: 'Test',
          field: 'test',
        },
      ];
      const withAlerts = AdvancedBusinessRules.calculateDataQualityScore(data, withCriticAlert);

      expect(withAlerts).toBeLessThan(noAlerts);
    });

    it('should return value between 0-100', () => {
      const testCases = [
        { produto: 'P', categoria: '', preco: -10, cidade: '' },
        { produto: '', categoria: '', preco: '', cidade: '' },
        { produto: 'Valid', categoria: 'Valid', preco: 100, cidade: 'Valid' },
      ];

      testCases.forEach((testData) => {
        const score = AdvancedBusinessRules.calculateDataQualityScore(testData as any, []);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });
    });

    it('should apply correct penalty for different alert severities', () => {
      const data = {
        produto: 'P',
        categoria: 'C',
        preco: 100,
        cidade: 'City',
      };

      const criticalAlert: ValidationAlert = {
        severity: 'CRÍTICO',
        code: 'TEST',
        message: 'Test',
        field: 'test',
      };
      const lowAlert: ValidationAlert = {
        severity: 'BAIXO',
        code: 'TEST',
        message: 'Test',
        field: 'test',
      };

      const withCritical = AdvancedBusinessRules.calculateDataQualityScore(data, [criticalAlert]);
      const withLow = AdvancedBusinessRules.calculateDataQualityScore(data, [lowAlert]);

      expect(withCritical).toBeLessThan(withLow);
    });
  });

  describe('CATEGORY_RULES', () => {
    it('should have required categories', () => {
      expect(AdvancedBusinessRules.CATEGORY_RULES['Eletrônicos']).toBeDefined();
      expect(AdvancedBusinessRules.CATEGORY_RULES['Eletrodomésticos']).toBeDefined();
      expect(AdvancedBusinessRules.CATEGORY_RULES['Vestuário']).toBeDefined();
      expect(AdvancedBusinessRules.CATEGORY_RULES['Alimentos']).toBeDefined();
      expect(AdvancedBusinessRules.CATEGORY_RULES['Serviços']).toBeDefined();
    });

    it('should have valid price ranges', () => {
      Object.entries(AdvancedBusinessRules.CATEGORY_RULES).forEach(([category, rules]) => {
        expect(rules.minPrice).toBeLessThan(rules.maxPrice);
        expect(rules.minPrice).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have keywords array', () => {
      Object.entries(AdvancedBusinessRules.CATEGORY_RULES).forEach(([category, rules]) => {
        expect(Array.isArray(rules.keywords)).toBe(true);
      });
    });
  });
});
