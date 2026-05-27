/**
 * Regras Avançadas de Validação de Negócio
 */

import { ValidationAlert } from '../dto/validation.dto';

export interface ValueAnalysis {
  isValid: boolean;
  quality: number; // 0-100
  alerts: ValidationAlert[];
  confidence: number; // 0-100
}

export class AdvancedBusinessRules {
  /**
   * Regras específicas por categoria
   */
  static readonly CATEGORY_RULES: {
    [key: string]: {
      minPrice: number;
      maxPrice: number;
      warningRange: [number, number];
      keywords: string[];
    };
  } = {
    Eletrônicos: {
      minPrice: 15,
      maxPrice: 50000,
      warningRange: [50, 100000],
      keywords: [
        'laptop',
        'notebook',
        'mouse',
        'teclado',
        'monitor',
        'webcam',
        'fone',
        'headset',
      ],
    },
    Eletrodomésticos: {
      minPrice: 80,
      maxPrice: 3000,
      warningRange: [200, 5000],
      keywords: ['fog', 'geladeira', 'microondas', 'máquina', 'liquidificador'],
    },
    Vestuário: {
      minPrice: 10,
      maxPrice: 500,
      warningRange: [30, 1000],
      keywords: ['camiseta', 'calça', 'vestido', 'jaqueta', 'sapato', 'meia'],
    },
    Alimentos: {
      minPrice: 0.5,
      maxPrice: 200,
      warningRange: [5, 500],
      keywords: ['arroz', 'feijão', 'pão', 'carne', 'fruta', 'leite', 'ovos'],
    },
    Serviços: {
      minPrice: 20,
      maxPrice: 10000,
      warningRange: [100, 50000],
      keywords: [
        'consultoria',
        'limpeza',
        'reparo',
        'instalação',
        'manutenção',
      ],
    },
    Outros: {
      minPrice: 1,
      maxPrice: 100000,
      warningRange: [100, 500000],
      keywords: [],
    },
  };

  /**
   * Detecta se produto pode ser falso/genérico
   */
  static isSuspiciousProductName(productName: string): ValidationAlert[] {
    const alerts: ValidationAlert[] = [];
    const name = productName.toLowerCase();

    // Produto muito genérico
    if (name.length < 3) {
      alerts.push({
        severity: 'ALTO',
        code: 'PRODUCT_TOO_GENERIC',
        field: 'produto',
        message: 'Nome do produto é muito genérico ou curto demais',
        suggestion: 'Adicione mais detalhes ao nome do produto',
      });
    }

    // Produtos conhecidos por ter muitas falsificações
    if (
      ['iphone', 'airpods', 'rolex', 'prada', 'gucci', 'louis vuitton'].some(
        (brand) => name.includes(brand),
      )
    ) {
      alerts.push({
        severity: 'MÉDIO',
        code: 'HIGH_COUNTERFEIT_RISK',
        field: 'produto',
        message: 'Produto é conhecido por alto risco de falsificação',
        suggestion: 'Verifique autenticidade com fabricante',
      });
    }

    // Produto com muitos números (possível código replicado)
    if (/\d{10,}/.test(name)) {
      alerts.push({
        severity: 'BAIXO',
        code: 'EXCESSIVE_NUMBERS',
        field: 'produto',
        message: 'Nome contém sequência longa de números',
        suggestion: 'Verifique se é realmente parte do nome',
      });
    }

    return alerts;
  }

  /**
   * Analisa anomalias de preço com lógica avançada
   */
  static analyzePriceAnomaly(
    price: number,
    category: string,
    allPrices?: number[],
  ): ValueAnalysis {
    const alerts: ValidationAlert[] = [];
    const rules =
      this.CATEGORY_RULES[category] || this.CATEGORY_RULES['Outros'];
    let quality = 100;
    let confidence = 95;

    // Validação básica
    if (price <= 0) {
      alerts.push({
        severity: 'CRÍTICO',
        code: 'INVALID_PRICE',
        field: 'preco',
        message: `Preço inválido: R$ ${price.toFixed(2)}`,
        suggestion: 'Preço deve ser maior que 0',
      });
      return { isValid: false, quality: 0, alerts, confidence: 5 };
    }

    // Fora do intervalo normal
    if (price < rules.minPrice) {
      alerts.push({
        severity: 'ALTO',
        code: 'PRICE_BELOW_MIN',
        field: 'preco',
        message: `Preço R$ ${price.toFixed(
          2,
        )} está abaixo do mínimo típico para ${category} (R$ ${
          rules.minPrice
        })`,
        suggestion: `Mínimo esperado: R$ ${rules.minPrice}`,
      });
      quality -= 30;
      confidence -= 20;
    }

    // Preço muito alto (10x ou mais)
    if (price > rules.maxPrice * 10) {
      alerts.push({
        severity: 'CRÍTICO',
        code: 'PRICE_EXTREME_HIGH',
        field: 'preco',
        message: `Preço extremamente alto: R$ ${price.toFixed(2)} (${(
          price / rules.maxPrice
        ).toFixed(1)}x acima do máximo)`,
        suggestion: `Máximo esperado: R$ ${rules.maxPrice}`,
      });
      quality -= 50;
      confidence -= 40;
    }

    // Preço alto (2-10x)
    if (price > rules.maxPrice && price <= rules.maxPrice * 10) {
      alerts.push({
        severity: 'MÉDIO',
        code: 'PRICE_ABOVE_NORMAL',
        field: 'preco',
        message: `Preço alto para ${category}: R$ ${price.toFixed(2)}`,
        suggestion: `Intervalo típico: R$ ${rules.minPrice} - R$ ${rules.maxPrice}`,
      });
      quality -= 15;
    }

    // Análise estatística se houver múltiplos preços
    if (allPrices && allPrices.length > 3) {
      const mean = allPrices.reduce((a, b) => a + b) / allPrices.length;
      const variance =
        allPrices.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
        allPrices.length;
      const stdDev = Math.sqrt(variance);

      if (stdDev > 0) {
        const zScore = Math.abs((price - mean) / stdDev);
        if (zScore > 3) {
          alerts.push({
            severity: 'ALTO',
            code: 'STATISTICAL_OUTLIER',
            field: 'preco',
            message: `Preço é outlier estatístico (Z-score: ${zScore.toFixed(
              2,
            )})`,
            suggestion: `Média da categoria: R$ ${mean.toFixed(
              2,
            )} (desvio: R$ ${stdDev.toFixed(2)})`,
          });
          quality -= 25;
          confidence -= 30;
        }
      }
    }

    return {
      isValid: price >= rules.minPrice && price <= rules.maxPrice * 10,
      quality: Math.max(0, quality),
      alerts,
      confidence: Math.max(0, confidence),
    };
  }

  /**
   * Valida consistência entre campos
   */
  static validateFieldConsistency(data: {
    produto?: string;
    categoria?: string;
    preco?: number;
    cidade?: string;
  }): ValidationAlert[] {
    const alerts: ValidationAlert[] = [];

    // Verifica se produto combina com categoria
    if (data.produto && data.categoria) {
      const productLower = data.produto.toLowerCase();
      const rules = this.CATEGORY_RULES[data.categoria];

      if (rules && !rules.keywords.some((kw) => productLower.includes(kw))) {
        alerts.push({
          severity: 'MÉDIO',
          code: 'PRODUCT_CATEGORY_MISMATCH',
          field: 'categoria',
          message: `Produto '${data.produto}' não combina tipicamente com categoria '${data.categoria}'`,
          suggestion: 'Verifique se a categoria está correta',
        });
      }
    }

    // Detecta cidades com padrão de erro
    if (data.cidade && data.cidade.length > 30) {
      alerts.push({
        severity: 'BAIXO',
        code: 'CITY_NAME_TOO_LONG',
        field: 'cidade',
        message: 'Nome da cidade é muito longo',
        suggestion: 'Verifique ortografia',
      });
    }

    return alerts;
  }

  /**
   * Score global de qualidade dos dados
   */
  static calculateDataQualityScore(
    data: {
      produto?: string;
      categoria?: string;
      preco?: number;
      cidade?: string;
    },
    alerts: ValidationAlert[],
  ): number {
    let score = 100;

    // Penalidades por campo vazio
    if (!data.produto || data.produto.trim().length === 0) score -= 25;
    if (!data.categoria || data.categoria.trim().length === 0) score -= 20;
    if (!data.preco || data.preco <= 0) score -= 30;
    if (!data.cidade || data.cidade.trim().length === 0) score -= 15;

    // Penalidades por alertas
    const alertPenalties = {
      CRÍTICO: 25,
      ALTO: 15,
      MÉDIO: 8,
      BAIXO: 3,
      INFO: 1,
    };

    for (const alert of alerts) {
      score -= alertPenalties[alert.severity] || 0;
    }

    return Math.max(0, Math.min(100, score));
  }
}
