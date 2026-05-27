import { ValidationRecordDto, ValidationResultDto } from './validation.dto';

export interface BatchValidationResultDto {
  rowIndex: number;
  record: ValidationRecordDto;
  result?: ValidationResultDto;
  error?: string;
  agentDecision?: unknown;
}

export interface BatchProcessResponse {
  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  results: BatchValidationResultDto[];
  processingTime: number;
}
