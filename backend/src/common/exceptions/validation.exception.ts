/**
 * Exceções Customizadas para o Sistema de Validação
 */

export class ValidationException extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public details?: any,
  ) {
    super(message);
    this.name = 'ValidationException';
  }
}

export class InvalidPriceException extends ValidationException {
  constructor(price: number, reason: string) {
    super(
      'INVALID_PRICE',
      `Preço inválido: R$ ${price.toFixed(2)} - ${reason}`,
      400,
      { price },
    );
  }
}

export class InvalidCategoryException extends ValidationException {
  constructor(category: string, availableCategories: string[]) {
    super(
      'INVALID_CATEGORY',
      `Categoria '${category}' não suportada. Categorias válidas: ${availableCategories.join(
        ', ',
      )}`,
      400,
      { category, availableCategories },
    );
  }
}

export class InvalidCityException extends ValidationException {
  constructor(city: string, reason: string) {
    super('INVALID_CITY', `Cidade '${city}' inválida: ${reason}`, 400, {
      city,
    });
  }
}

export class InvalidProductNameException extends ValidationException {
  constructor(productName: string, reason: string) {
    super(
      'INVALID_PRODUCT',
      `Produto '${productName}' inválido: ${reason}`,
      400,
      { productName },
    );
  }
}

export class DatabaseException extends ValidationException {
  constructor(operation: string, error: any) {
    super(
      'DATABASE_ERROR',
      `Erro ao ${operation} no banco de dados: ${error.message}`,
      500,
      { operation, originalError: error.message },
    );
  }
}

export class BatchProcessingException extends ValidationException {
  constructor(processedCount: number, totalCount: number, failedItems: any[]) {
    super(
      'BATCH_ERROR',
      `Processamento em lote parcialmente falhou: ${processedCount}/${totalCount} processados`,
      422,
      { processedCount, totalCount, failedItems },
    );
  }
}

export class ConfigurationException extends ValidationException {
  constructor(configKey: string, reason: string) {
    super(
      'CONFIG_ERROR',
      `Erro de configuração para '${configKey}': ${reason}`,
      500,
      { configKey },
    );
  }
}
