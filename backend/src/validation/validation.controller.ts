import { Controller, Post, Body, Get, Inject, forwardRef } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { ValidationService } from './validation.service';
import { AgentService } from '../agent/agent.service';
import { ValidationRecordDto, ValidationResultDto } from './dto/validation.dto';
import { BatchValidationResultDto, BatchProcessResponse } from './dto/batch.dto';

@ApiTags('validation')
@Controller('validation')
export class ValidationController {
  constructor(
    private readonly validationService: ValidationService,
    @Inject(forwardRef(() => AgentService))
    private readonly agentService: AgentService,
  ) {}

  @Get('info')
  @ApiOperation({ summary: 'Obter informações do sistema de validação' })
  @ApiResponse({ status: 200, description: 'Informações do sistema' })
  getInfo() {
    return {
      version: '2.0',
      name: 'FINTECH DATA QUALITY ENGINE',
      description: 'Autonomous validation agent for credit risk analysis and regulatory compliance',
    };
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validar um registro de dados' })
  @ApiBody({ type: ValidationRecordDto, description: 'Dados do produto a validar' })
  @ApiResponse({ status: 200, description: 'Resultado da validação' })
  @ApiResponse({ status: 400, description: 'Erro na validação' })
  validate(@Body() record: ValidationRecordDto): ValidationResultDto & { agentDecision?: any } {
    const validationResult = this.validationService.validate(record);
    
    // Automatically process through agent and persist
    const recordId = `VAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const agentDecision = this.agentService.evaluateValidation(recordId, validationResult);
    
    return {
      ...validationResult,
      agentDecision,
    };
  }

  @Post('batch-validate')
  @ApiOperation({ summary: 'Validar múltiplos registros em lote' })
  @ApiBody({ type: [ValidationRecordDto], description: 'Array de dados para validação' })
  @ApiResponse({ status: 200, description: 'Resultado do processamento em lote' })
  batchValidate(@Body() records: ValidationRecordDto[]): BatchProcessResponse {
    const batchResult = this.validationService.batchValidate(records);
    
    // Process all successful validations through agent and persist
    if (batchResult.results && Array.isArray(batchResult.results)) {
      batchResult.results.forEach((item: any, index: number) => {
        if (item.result && !item.error) {
          const recordId = `IMP-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`;
          try {
            const agentDecision = this.agentService.evaluateValidation(recordId, item.result);
            item.agentDecision = agentDecision;
          } catch (err) {
            console.error(`Error processing item ${index} through agent:`, err);
          }
        }
      });
    }
    
    return batchResult;
  }

  @Get('interface')
  getInterface() {
    return {
      interface: this.validationService.getValidationInterface('PROCESSANDO'),
    };
  }
}
