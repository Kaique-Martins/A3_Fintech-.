import { IsString, IsNumber, IsOptional, IsPositive, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ValidationRecordDto {
  @ApiProperty({ description: 'Nome do produto', example: 'Notebook Dell Inspiron' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  produto!: string;

  @ApiPropertyOptional({ description: 'Categoria do produto', example: 'Eletrônicos' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  categoria?: string;

  @ApiProperty({ description: 'Preço do produto', example: 2500.00 })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  preco!: number;

  @ApiProperty({ description: 'Cidade de origem', example: 'São Paulo' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  cidade!: string;
}

export class CorrectedDataDto {
  produto!: string;
  categoria!: string;
  preco!: number;
  cidade!: string;
}

export type ValidationStatus = 'APROVADO' | 'QUARENTENA';

export interface ValidationAlert {
  severity: 'CRÍTICO' | 'ALTO' | 'MÉDIO' | 'BAIXO' | 'INFO';
  code: string;
  message: string;
  field: string;
  suggestion?: string;
}

export class ValidationResultDto {
  dado_corrigido!: CorrectedDataDto;
  status!: ValidationStatus;
  motivo!: string;
  qualityScore!: number; // 0-100
  confidenceLevel!: number; // 0-100
  alerts!: ValidationAlert[];
  recommendations!: string[];
}
