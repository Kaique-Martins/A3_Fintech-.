import { Injectable } from '@nestjs/common';
import {
  CITIES_MAPPING,
  VALID_CATEGORIES,
  MARKET_PRICES,
  CATEGORY_KEYWORDS,
} from './constants/references';
import {
  ValidationRecordDto,
  ValidationResultDto,
  CorrectedDataDto,
  ValidationAlert,
} from './dto/validation.dto';
import { BatchProcessResponse, BatchValidationResultDto } from './dto/batch.dto';
import { PrecisionAlgorithms } from './algorithms/precision.algorithm';
import { AdvancedBusinessRules } from './algorithms/business-rules';
import {
  InvalidPriceException,
  InvalidCategoryException,
  InvalidCityException,
  InvalidProductNameException,
} from '../common/exceptions';
import { AppLogger } from '../common/logger';

interface Tuple<T> {
  value: T;
  reason: string;
}

@Injectable()
export class ValidationService {
  /**
   * Normaliza texto removendo espaços extras e convertendo para lowercase
   */
  private normalizeText(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }
    return text.trim().toLowerCase().replace(/\s+/g, ' '); // Remove espaços múltiplos
  }

  /**
   * Padroniza cidade com fuzzy matching inteligente
   */
  private standardizeCity(city: string): Tuple<string> {
    const normalized = this.normalizeText(city);

    // Busca exata
    if (normalized in CITIES_MAPPING) {
      const standardized = CITIES_MAPPING[normalized];
      return {
        value: standardized,
        reason:
          city !== standardized
            ? `Cidade padronizada de '${city}' para '${standardized}'`
            : '',
      };
    }

    // Busca por abreviações (2 caracteres)
    if (normalized.length === 2) {
      for (const [key, value] of Object.entries(CITIES_MAPPING)) {
        if (normalized === key) {
          return {
            value,
            reason: `Cidade corrigida de '${city}' para '${value}' (abreviação)`,
          };
        }
      }
    }

    // Fuzzy matching com Levenshtein distance
    if (normalized.length > 2) {
      let bestMatch: { city: string; similarity: number } | null = null;

      for (const [key, value] of Object.entries(CITIES_MAPPING)) {
        const similarity = PrecisionAlgorithms.similarity(normalized, key);
        if (
          similarity >= 80 &&
          (!bestMatch || similarity > bestMatch.similarity)
        ) {
          bestMatch = { city: value, similarity };
        }
      }

      if (bestMatch) {
        return {
          value: bestMatch.city,
          reason: `Cidade corrigida com fuzzy matching: '${city}' → '${
            bestMatch.city
          }' (${bestMatch.similarity.toFixed(1)}%)`,
        };
      }
    }

    return { value: city, reason: '' };
  }

  /**
   * Padroniza categoria com fuzzy matching
   */
  private standardizeCategory(category: string): Tuple<string> {
    const normalized = this.normalizeText(category);

    // Busca exata
    for (const validCat of VALID_CATEGORIES) {
      if (normalized === validCat.toLowerCase()) {
        return { value: validCat, reason: '' };
      }
    }

    // Busca parcial
    for (const validCat of VALID_CATEGORIES) {
      if (
        normalized.includes(validCat.toLowerCase()) ||
        validCat.toLowerCase().includes(normalized)
      ) {
        return {
          value: validCat,
          reason: `Categoria corrigida de '${category}' para '${validCat}'`,
        };
      }
    }

    // Fuzzy matching
    let bestMatch: { category: string; similarity: number } | null = null;

    for (const validCat of VALID_CATEGORIES) {
      const similarity = PrecisionAlgorithms.similarity(
        normalized,
        validCat.toLowerCase(),
      );
      if (
        similarity >= 75 &&
        (!bestMatch || similarity > bestMatch.similarity)
      ) {
        bestMatch = { category: validCat, similarity };
      }
    }

    if (bestMatch) {
      return {
        value: bestMatch.category,
        reason: `Categoria corrigida com fuzzy matching: '${category}' → '${
          bestMatch.category
        }' (${bestMatch.similarity.toFixed(1)}%)`,
      };
    }

    return { value: category, reason: '' };
  }

  /**
   * Infere categoria a partir do nome do produto
   */
  private inferCategory(product: string): Tuple<string> {
    const productLower = this.normalizeText(product);

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      for (const keyword of keywords as string[]) {
        if (productLower.includes(keyword)) {
          return {
            value: category,
            reason: `Categoria inferida como '${category}' baseado no produto '${product}'`,
          };
        }
      }
    }

    return {
      value: 'Outros',
      reason: `Categoria padrão 'Outros' atribuída (produto: '${product}')`,
    };
  }

  /**
   * Valida e analisa preço com lógica avançada
   */
  private validatePrice(
    price: number,
    category: string,
  ): { isValid: boolean; reason: string; quality: number; confidence: number } {
    try {
      if (typeof price !== 'number' || isNaN(price)) {
        throw new InvalidPriceException(price, 'Valor não é um número válido');
      }

      if (price <= 0) {
        throw new InvalidPriceException(price, 'valor não pode ser ≤ 0');
      }

      const marketRange = MARKET_PRICES[category] || MARKET_PRICES['Outros'];
      const { min: minPrice, max: maxPrice } = marketRange;

      // Análise avançada
      const analysis = AdvancedBusinessRules.analyzePriceAnomaly(
        price,
        category,
      );

      return {
        isValid: analysis.isValid,
        reason: analysis.alerts
          .map((a) => `${a.severity}: ${a.message}`)
          .join(' | '),
        quality: analysis.quality,
        confidence: analysis.confidence,
      };
    } catch (error) {
      if (error instanceof InvalidPriceException) {
        throw error;
      }
      throw new InvalidPriceException(
        price,
        `Erro ao validar: ${
          error instanceof Error ? error.message : 'Erro desconhecido'
        }`,
      );
    }
  }

  /**
   * Valida completude e qualidade dos dados
   */
  private getDataCompleteness(record: ValidationRecordDto): number {
    let completeness = 0;
    const totalFields = 4;

    if (record.produto?.trim()) completeness++;
    if (record.categoria?.trim()) completeness++;
    if (record.preco && record.preco > 0) completeness++;
    if (record.cidade?.trim()) completeness++;

    return (completeness / totalFields) * 100;
  }

  public getValidationInterface(status: string): string {
    return `╔════════════════════════════════════════════╗
║      FINTECH DATA QUALITY ENGINE v3.0      ║
║           MODO PRECISÃO MÁXIMA             ║
╠════════════════════════════════════════════╣
║ Status da Análise: [${status}]
║ Origem do Dado: Cadastro de Produto        ║
║ Finalidade: Compliance + Score de Crédito  ║
╚════════════════════════════════════════════╝`;
  }

  public validate(record: ValidationRecordDto): ValidationResultDto {
    try {
      return this.performValidation(record);
    } catch (error) {
      // Se é uma exceção customizada, relançar
      if (
        error instanceof InvalidPriceException ||
        error instanceof InvalidCategoryException ||
        error instanceof InvalidCityException ||
        error instanceof InvalidProductNameException
      ) {
        throw error;
      }
      // Se é um erro genérico, retornar resultado com status QUARENTENA
      throw new Error(
        `Erro durante validação: ${
          error instanceof Error ? error.message : 'Erro desconhecido'
        }`,
      );
    }
  }

  private performValidation(record: ValidationRecordDto): ValidationResultDto {
    const dadoCorrigido: any = Object.assign({}, record);
    let status: 'APROVADO' | 'QUARENTENA' = 'APROVADO';
    const motivos: string[] = [];
    const alerts: ValidationAlert[] = [];
    const recommendations: string[] = [];
    let qualityScore = 100;
    let confidenceLevel = 95;

    // 1. VALIDAÇÃO DE COMPLETUDE
    const completeness = this.getDataCompleteness(record);
    if (completeness < 100) {
      qualityScore -= (100 - completeness) * 0.3;
    }

    // 2. NORMALIZAÇÃO DE PRODUTO
    if (dadoCorrigido.produto) {
      const produtoOriginal = dadoCorrigido.produto;
      dadoCorrigido.produto = (dadoCorrigido.produto as string).trim();

      if (produtoOriginal !== dadoCorrigido.produto) {
        motivos.push('Produto: espaços removidos');
      }

      // Verifica qualidade do nome do produto
      const productQuality = PrecisionAlgorithms.stringQualityScore(
        dadoCorrigido.produto,
      );
      if (productQuality < 60) {
        qualityScore -= 15;
      }

      // Detecta produtos suspeitos
      const suspiciousAlerts = AdvancedBusinessRules.isSuspiciousProductName(
        dadoCorrigido.produto,
      );
      alerts.push(...suspiciousAlerts);
    }

    // 3. PADRONIZAÇÃO E IMPUTAÇÃO DE CATEGORIA
    const categoriaOriginal = (dadoCorrigido.categoria || '').trim();

    if (
      !categoriaOriginal ||
      ['null', 'none', 'n/a', '-', ''].includes(categoriaOriginal.toLowerCase())
    ) {
      // Categoria vazia - tenta inferir
      const { value: categoriaInferida, reason: msgInfer } = this.inferCategory(
        dadoCorrigido.produto || '',
      );
      dadoCorrigido.categoria = categoriaInferida;
      motivos.push(msgInfer);
      confidenceLevel -= 15; // Categoria inferida reduz confiança
    } else {
      // Categoria existente - tenta padronizar
      const { value: categoriaPadrao, reason: msgPadrao } =
        this.standardizeCategory(categoriaOriginal);
      if (categoriaOriginal !== categoriaPadrao) {
        dadoCorrigido.categoria = categoriaPadrao;
        if (msgPadrao) {
          motivos.push(msgPadrao);
        }
      } else {
        dadoCorrigido.categoria = categoriaPadrao;
      }
    }

    // 4. PADRONIZAÇÃO DE CIDADE
    if (dadoCorrigido.cidade) {
      const cidadeOriginal = dadoCorrigido.cidade;
      const { value: cidadeCorrigida, reason: msgCity } =
        this.standardizeCity(cidadeOriginal);
      dadoCorrigido.cidade = cidadeCorrigida;
      if (msgCity) {
        motivos.push(msgCity);
      }
    }

    // 5. DETECÇÃO AVANÇADA DE ANOMALIAS DE PREÇO
    if (dadoCorrigido.preco !== undefined) {
      const preco = parseFloat(dadoCorrigido.preco);
      const categoria = dadoCorrigido.categoria || 'Outros';

      const { isValid, reason, quality, confidence } = this.validatePrice(
        preco,
        categoria,
      );

      qualityScore = Math.min(qualityScore, quality);
      confidenceLevel = Math.min(confidenceLevel, confidence);

      if (!isValid) {
        status = 'QUARENTENA';
      }

      if (reason) {
        motivos.push(reason);
      }
    }

    // 6. VALIDAÇÃO DE CONSISTÊNCIA ENTRE CAMPOS
    const consistencyAlerts =
      AdvancedBusinessRules.validateFieldConsistency(dadoCorrigido);
    alerts.push(...consistencyAlerts);

    // 7. DETECÇÃO DE CARACTERES INVÁLIDOS
    ['produto', 'cidade', 'categoria'].forEach((field) => {
      if (
        dadoCorrigido[field] &&
        PrecisionAlgorithms.hasInvalidCharacters(dadoCorrigido[field])
      ) {
        alerts.push({
          severity: 'MÉDIO',
          code: 'INVALID_CHARACTERS',
          field,
          message: `Campo '${field}' contém caracteres inválidos ou encoding problemático`,
          suggestion: 'Verifique encoding do arquivo',
        });
        qualityScore -= 10;
      }
    });

    // 8. CALCULAR SCORE FINAL DE QUALIDADE
    const finalQualityScore = AdvancedBusinessRules.calculateDataQualityScore(
      dadoCorrigido,
      alerts,
    );
    qualityScore = Math.min(qualityScore, finalQualityScore);

    // 9. GERAR RECOMENDAÇÕES
    if (alerts.length > 0) {
      recommendations.push(
        `Detectados ${alerts.length} alertas - revisar campos críticos`,
      );
      const criticalAlerts = alerts.filter((a) => a.severity === 'CRÍTICO');
      if (criticalAlerts.length > 0) {
        recommendations.push(
          '⚠️ CRÍTICO: Existem problemas que precisam correção imediata',
        );
      }
    }

    if (confidenceLevel < 50) {
      recommendations.push(
        '⚠️ Confiança baixa nos dados - validação manual recomendada',
      );
    }

    const resultado: ValidationResultDto = {
      dado_corrigido: {
        produto: dadoCorrigido.produto || '',
        categoria: dadoCorrigido.categoria || 'Outros',
        preco: parseFloat(dadoCorrigido.preco) || 0,
        cidade: dadoCorrigido.cidade || '',
      },
      status,
      motivo: motivos.join(' | '),
      qualityScore: Math.max(0, Math.min(100, Math.round(qualityScore))),
      confidenceLevel: Math.max(0, Math.min(100, Math.round(confidenceLevel))),
      alerts,
      recommendations,
    };

    // Log da validação
    AppLogger.logValidation({
      product: dadoCorrigido.produto,
      category: dadoCorrigido.categoria,
      status: resultado.status,
      qualityScore: resultado.qualityScore,
      alertsCount: alerts.length,
    });

    return resultado;
  }

  public batchValidate(records: ValidationRecordDto[]): BatchProcessResponse {
    const startTime = Date.now();
    const results: BatchValidationResultDto[] = [];
    let successCounter = 0;

    for (let index = 0; index < records.length; index++) {
      try {
        const result = this.validate(records[index]);
        results.push({
          rowIndex: index + 1,
          record: records[index],
          result,
        });
        successCounter++;
      } catch (error) {
        results.push({
          rowIndex: index + 1,
          record: records[index],
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const processingTime = Date.now() - startTime;

    // Log do processamento em lote
    AppLogger.logBatchProcess(
      records.length,
      successCounter,
      records.length - successCounter,
    );

    return {
      totalRecords: records.length,
      processedRecords: results.length,
      successfulRecords: successCounter,
      results,
      processingTime,
    };
  }
}
