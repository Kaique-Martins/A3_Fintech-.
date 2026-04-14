# 🛠️ Developer Guide - Como Estender as Regras de Validação

## Visão Geral

O sistema de validação fintech foi projetado para ser altamente extensível. Este guia explica como adicionar novas regras, algoritmos e funcionalidades.

## Arquitetura

O sistema é dividido em 3 camadas principais:

```
Controllers (API)
    ↓
Services (Lógica)
    ↓
Algorithms (Regras)
```

## 1. Adicionando uma Nova Regra de Negócio

### Passo 1: Adicionar constantes

Edite `src/validation/constants/references.ts`:

```typescript
// Exemplo: Adicionar nova categoria
export const VALID_CATEGORIES = [
  'Eletrônicos',
  'Eletrodomésticos',
  'Vestuário',
  'Alimentos',
  'Serviços',
  'Imóveis',  // ← NOVA CATEGORIA
];

// Adicionar range de preços
export const MARKET_PRICES: { [key: string]: { min: number; max: number } } = {
  // ... existentes
  'Imóveis': {
    min: 50000,
    max: 10000000,
  },
};

// Adicionar palavras-chave
export const CATEGORY_KEYWORDS: { [key: string]: string[] } = {
  // ... existentes
  'Imóveis': ['casa', 'apartamento', 'terreno', 'propriedade', 'lote'],
};
```

### Passo 2: Adicionar regra em AdvancedBusinessRules

Edite `src/validation/algorithms/business-rules.ts`:

```typescript
export class AdvancedBusinessRules {
  // Adicionar regra customizada
  static detectPropertyFraud(product: string, price: number): ValidationAlert[] {
    const alerts: ValidationAlert[] = [];
    const productLower = product.toLowerCase();

    // Detectar casarões muito baratos (suspeito)
    if (
      ['mansão', 'sobrado', 'casa grande'].some((term) =>
        productLower.includes(term),
      ) &&
      price < 200000
    ) {
      alerts.push({
        severity: 'CRÍTICO',
        code: 'SUSPICIOUS_PROPERTY_PRICE',
        field: 'preco',
        message: `Propriedade de grande porte com preço suspeito: R$ ${price.toFixed(2)}`,
        suggestion: 'Verificar autenticidade do imóvel e do vendedor',
      });
    }

    return alerts;
  }
}
```

### Passo 3: Usar a nova regra no ValidationService

Edite `src/validation/validation.service.ts`:

```typescript
private performValidation(record: ValidationRecordDto): ValidationResultDto {
  // ... código existente

  // Se categoria é Imóveis, aplicar regras específicas
  if (dadoCorrigido.categoria === 'Imóveis' && dadoCorrigido.produto) {
    const propertyAlerts = AdvancedBusinessRules.detectPropertyFraud(
      dadoCorrigido.produto,
      dadoCorrigido.preco,
    );
    alerts.push(...propertyAlerts);
  }

  // ... resto do código
}
```

### Passo 4: Testar a nova regra

Crie um teste em `src/validation/algorithms/business-rules.spec.ts`:

```typescript
describe('AdvancedBusinessRules', () => {
  describe('detectPropertyFraud', () => {
    it('should alert on suspicious property price', () => {
      const result = AdvancedBusinessRules.detectPropertyFraud('Mansão de Luxo', 100000);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].code).toBe('SUSPICIOUS_PROPERTY_PRICE');
    });

    it('should not alert on normal property price', () => {
      const result = AdvancedBusinessRules.detectPropertyFraud('Mansão de Luxo', 1000000);
      expect(result.length).toBe(0);
    });
  });
});
```

Execute: `npm test`

---

## 2. Adicionando um Novo Algoritmo

### Exemplo: Algoritmo de Similaridade Avançada

Crie `src/validation/algorithms/advanced-similarity.algorithm.ts`:

```typescript
export class AdvancedSimilarityAlgorithm {
  /**
   * Calcula similaridade considerando contexto semântico
   */
  static semanticSimilarity(str1: string, str2: string, context?: string): number {
    // Começa com Levenshtein
    const distance = PrecisionAlgorithms.levenshteinDistance(str1, str2);
    let similarity = PrecisionAlgorithms.similarity(str1, str2);

    // Bônus por termo comum no contexto
    if (context) {
      const contextTerms = context.toLowerCase().split(' ');
      const s1Terms = str1.toLowerCase().split(' ');
      const s2Terms = str2.toLowerCase().split(' ');

      const commonTerms = s1Terms.filter((t) => s2Terms.includes(t));
      if (commonTerms.length > 0) {
        similarity = Math.min(100, similarity + 10);
      }
    }

    return similarity;
  }
}
```

Crie testes em `src/validation/algorithms/advanced-similarity.algorithm.spec.ts`:

```typescript
import { AdvancedSimilarityAlgorithm } from './advanced-similarity.algorithm';

describe('AdvancedSimilarityAlgorithm', () => {
  it('should calculate semantic similarity', () => {
    const result = AdvancedSimilarityAlgorithm.semanticSimilarity(
      'iPhone 14 Pro',
      'iPhone 14 Pro Max',
      'Apple smartphone',
    );
    expect(result).toBeGreaterThan(75);
  });
});
```

---

## 3. Adicionando Validação Customizada na Controller

Estenda `src/validation/validation.controller.ts`:

```typescript
@Post('validate-premium')
@ApiOperation({ summary: 'Validação com regras premium' })
validatePremium(@Body() record: ValidationRecordDto) {
  // Aplicar lógicas adicionais
  const baseValidation = this.validationService.validate(record);

  // Aplicar regras premium
  if (record.categoria === 'Eletrônicos' && record.preco > 50000) {
    baseValidation.alerts.push({
      severity: 'MÉDIO',
      code: 'PREMIUM_ITEM',
      field: 'preco',
      message: 'Item premium - recomenda-se verificação humana adicional',
    });
  }

  return baseValidation;
}
```

---

## 4. Estendendo o Agente Autônomo

Edite `src/agent/agent.service.ts`:

```typescript
@Injectable()
export class AgentService {
  evaluateValidation(recordId: string, result: ValidationResultDto) {
    // Lógica existente
    let decision = 'APROVADO';

    // Adicionar nova regra
    const criticalAlerts = result.alerts.filter((a) => a.severity === 'CRÍTICO');
    if (criticalAlerts.length > 2) {
      decision = 'REJEITAR_MANUAL';  // Força revisão manual
    }

    // Log da decisão
    AppLogger.logAgentDecision({
      recordId,
      decision,
      reasoning: `Alerts: ${result.alerts.length}, Quality: ${result.qualityScore}`,
    });

    return { decision, recordId };
  }
}
```

---

## 5. Adicionando Integração com APIs Externas

Crie `src/external-api.service.ts`:

```typescript
@Injectable()
export class ExternalApiService {
  /**
   * Valida gegen CNPJ/CPF em base de dados externa
   */
  async validateEntity(cnpj: string): Promise<boolean> {
    try {
      const response = await fetch(`https://external-api.com/validate?cnpj=${cnpj}`);
      const data = await response.json();
      return data.isValid;
    } catch (error) {
      AppLogger.logValidationError(error, { cnpj });
      throw new Error('Falha ao validar entidade');
    }
  }

  /**
   * Busca histórico de fraude
   */
  async checkFraudHistory(phone: string): Promise<any> {
    // Implementação
  }
}
```

---

## 6. Modificando o DTO de Validação

Se precisar de novos campos, edite `src/validation/dto/validation.dto.ts`:

```typescript
export class ValidationRecordDto {
  produto: string;
  categoria: string;
  preco: number;
  cidade: string;
  
  // NOVOS CAMPOS
  telefone?: string;
  cnpj?: string;
  dataTransacao?: Date;
}
```

**Importante:** Atualize os testes e fixtures!

---

## 7. Adicionando Middleware Customizado

Crie `src/common/middleware/custom.middleware.ts`:

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class CustomMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Adicionar lógica customizada
    req.headers['x-custom-id'] = `REQ-${Date.now()}`;
    next();
  }
}
```

Registre em `src/validation/validation.module.ts`:

```typescript
export class ValidationModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CustomMiddleware).forRoutes('validation');
  }
}
```

---

## 8. Rodando Testes

```bash
# Todos os testes
npm test

# Com cobertura
npm test:cov

# Watch mode (durante desenvolvimento)
npm test:watch
```

---

## 9. Build e Deploy

```bash
# Build
npm run build

# Start em produção
npm run start:prod

# Start com watch (desenvolvimento)
npm run start:dev
```

---

## Checklist ao Adicionar Nova Regra

- [ ] Adicione constantes em `references.ts`
- [ ] Adicione método em `business-rules.ts` ou crie novo algoritmo
- [ ] Integre em `validation.service.ts`
- [ ] Crie testes para a nova regra
- [ ] Rode `npm test` para validar
- [ ] Rode `npm run build` para compilar
- [ ] Atualize documentação
- [ ] Teste via Swagger em `/api/docs`

---

## Recursos Adicionais

- 📖 [NestJS Docs](https://docs.nestjs.com/)
- 🧪 [Jest Testing](https://jestjs.io/)
- 📝 [OpenAPI/Swagger](https://swagger.io/)
- 📊 [Algoritmos de String](https://en.wikipedia.org/wiki/Levenshtein_distance)

---

## Suporte

Encontrou um bug ao estender? Abra uma issue no GitHub descrevendo:
- O que tentou fazer
- Qual erro recebeu
- Como reproduzir

