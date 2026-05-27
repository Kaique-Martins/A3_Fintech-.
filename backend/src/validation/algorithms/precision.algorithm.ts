/**
 * Algoritmos de Precisão para Validação de Dados
 */

export class PrecisionAlgorithms {
  /**
   * Calcula Levenshtein Distance entre duas strings
   * Usa para fuzzy matching mais preciso
   */
  static levenshteinDistance(str1: string, str2: string): number {
    const track = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(0));

    for (let i = 0; i <= str1.length; i += 1) {
      track[0][i] = i;
    }
    for (let j = 0; j <= str2.length; j += 1) {
      track[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j += 1) {
      for (let i = 1; i <= str1.length; i += 1) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1,
          track[j - 1][i] + 1,
          track[j - 1][i - 1] + indicator,
        );
      }
    }

    return track[str2.length][str1.length];
  }

  /**
   * Calcula similaridade percentual (0-100)
   */
  static similarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 100;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return ((longer.length - editDistance) / longer.length) * 100;
  }

  /**
   * Detecção de outliers usando IQR (Interquartile Range)
   */
  static detectOutliers(values: number[]): {
    outliers: number[];
    isOutlier: (value: number) => boolean;
  } {
    if (values.length < 4) {
      return { outliers: [], isOutlier: () => false };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length / 4)];
    const q3 = sorted[Math.floor((sorted.length * 3) / 4)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    return {
      outliers: values.filter((v) => v < lowerBound || v > upperBound),
      isOutlier: (value: number) => value < lowerBound || value > upperBound,
    };
  }

  /**
   * Calcula Z-score para detecção de anomalias estatísticas
   */
  static calculateZScore(value: number, mean: number, stdDev: number): number {
    if (stdDev === 0) return 0;
    return Math.abs((value - mean) / stdDev);
  }

  /**
   * Calcula média de um array
   */
  static mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Calcula desvio padrão
   */
  static stdDev(values: number[]): number {
    const avg = this.mean(values);
    const squareDiffs = values.map((v) => Math.pow(v - avg, 2));
    return Math.sqrt(this.mean(squareDiffs));
  }

  /**
   * Valida formato de string com regex
   */
  static matchesPattern(value: string, pattern: RegExp): boolean {
    return pattern.test(value);
  }

  /**
   * Detecta caracteres suspeitos ou encoding inválido
   */
  static hasInvalidCharacters(value: string): boolean {
    // Detecta caracteres de controle, unicode inválido, etc
    const invalidPatterns = [/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g];
    return invalidPatterns.some((pattern) => pattern.test(value));
  }

  /**
   * Calcula score de qualidade de string (0-100)
   */
  static stringQualityScore(value: string): number {
    if (!value || value.trim().length === 0) return 0;

    let score = 100;

    // Penalidade por espaços extras
    if (/\s{2,}/.test(value)) score -= 10;

    // Penalidade por caracteres especiais excessivos
    const specialChars = value.match(/[^a-zA-Z0-9\s]/g) || [];
    if (specialChars.length > value.length * 0.3) score -= 20;

    // Bonus por capitalização correta
    if (/^[A-Z]/.test(value)) score += 5;

    // Penalidade por números aleatórios
    if (/\d{5,}/.test(value)) score -= 15;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Detecta duplicatas com fuzzy matching
   */
  static findDuplicates(
    items: string[],
    threshold = 85,
  ): Array<[number, number, number]> {
    const duplicates: Array<[number, number, number]> = [];

    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const sim = this.similarity(
          items[i].toLowerCase(),
          items[j].toLowerCase(),
        );
        if (sim >= threshold) {
          duplicates.push([i, j, Math.round(sim)]);
        }
      }
    }

    return duplicates;
  }

  /**
   * Cálculo de confiança em validação (0-100)
   */
  static confidenceScore(factors: { [key: string]: number }): {
    score: number;
    reasons: string[];
  } {
    const weights: { [key: string]: number } = {
      dataCompleteness: 0.25,
      dataAccuracy: 0.3,
      dataConsistency: 0.25,
      dataValidity: 0.2,
    };

    const reasons: string[] = [];
    let totalScore = 0;

    for (const [key, weight] of Object.entries(weights)) {
      const value = factors[key] || 0;
      totalScore += value * weight;

      if (value < 50) {
        reasons.push(`⚠️ ${key}: ${value}%`);
      }
    }

    return { score: Math.round(totalScore), reasons };
  }
}
