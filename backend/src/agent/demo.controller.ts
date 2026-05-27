import { Controller, Get, Post } from '@nestjs/common';
import { ValidationService } from '../validation/validation.service';
import { AgentService } from './agent.service';
import {
  ValidationRecordDto,
  ValidationResultDto,
} from '../validation/dto/validation.dto';
import { Logger } from '@nestjs/common';
import { AgentDecision } from './agent.types';

interface DemoScenario {
  label: string;
  product: ValidationRecordDto;
  priceVariationPercent?: number;
}

interface DemoSnapshot {
  recordId: string;
  scenario: string;
  input: ValidationRecordDto;
  validation: ValidationResultDto;
  agentDecision: AgentDecision;
  timestamp: string;
}

/**
 * Demo Controller
 * Generates continuous demo data to showcase the entire system working together
 */
@Controller('demo')
export class DemoController {
  private readonly logger = new Logger(DemoController.name);
  private isRunning = false;
  private demoInterval: any;
  private demoScenarioIndex = 0;
  private lastSnapshot: DemoSnapshot | null = null;

  private readonly demoScenarios: DemoScenario[] = [
    {
      label: 'Compra padrão aprovada',
      product: {
        produto: 'Notebook Dell Inspiron 15 3520',
        categoria: 'Eletrônicos',
        preco: 3899,
        cidade: 'São Paulo',
      },
      priceVariationPercent: 0.03,
    },
    {
      label: 'Categoria inferida automaticamente',
      product: {
        produto: 'iPhone 15 128GB',
        categoria: '',
        preco: 6299,
        cidade: 'RJ',
      },
      priceVariationPercent: 0.02,
    },
    {
      label: 'Cidade e categoria padronizadas',
      product: {
        produto: 'Smart TV LG 55 polegadas 4K',
        categoria: 'eletronicos',
        preco: 2999,
        cidade: 'sp',
      },
      priceVariationPercent: 0.04,
    },
    {
      label: 'Serviço de ticket médio',
      product: {
        produto: 'Serviço de instalação de ar-condicionado split',
        categoria: 'Serviços',
        preco: 480,
        cidade: 'Curitiba',
      },
      priceVariationPercent: 0.08,
    },
    {
      label: 'Compra de varejo com preço limítrofe',
      product: {
        produto: 'Geladeira Brastemp Frost Free 375L',
        categoria: 'Eletrodomésticos',
        preco: 4299,
        cidade: 'Belo Horizonte',
      },
      priceVariationPercent: 0.06,
    },
    {
      label: 'Produto em quarentena para contraste',
      product: {
        produto: 'Notebook Samsung Book',
        categoria: 'Eletrônicos',
        preco: 0.01,
        cidade: 'Fortaleza',
      },
      priceVariationPercent: 0,
    },
    {
      label: 'Categoria ausente em varejo alimentar',
      product: {
        produto: 'Cesta básica familiar mensal',
        categoria: undefined,
        preco: 249.9,
        cidade: 'Recife',
      },
      priceVariationPercent: 0.05,
    },
    {
      label: 'Item de vestuário com baixa variabilidade',
      product: {
        produto: 'Camiseta algodão premium',
        categoria: 'Vestuário',
        preco: 89.9,
        cidade: 'Porto Alegre',
      },
      priceVariationPercent: 0.1,
    },
  ];

  constructor(
    private readonly validationService: ValidationService,
    private readonly agentService: AgentService,
  ) {}

  /**
   * Start the demo - generates data continuously
   */
  @Post('start')
  startDemo() {
    if (this.isRunning) {
      return { message: '✅ Demo is already running', status: 'running' };
    }

    this.isRunning = true;
    this.logger.log('🎬 DEMO STARTED - Generating continuous data flow...');

    // Processa um registro imediatamente e depois a cada 3 segundos
    this.generateDemoData();
    this.demoInterval = setInterval(() => {
      this.generateDemoData();
    }, 3000);

    return {
      message: '🎬 Demo started! Generating data every 3 seconds...',
      status: 'started',
    };
  }

  /**
   * Stop the demo
   */
  @Post('stop')
  stopDemo() {
    if (this.demoInterval) {
      clearInterval(this.demoInterval);
    }
    this.isRunning = false;
    this.logger.log('⏹️  DEMO STOPPED');
    return { message: '⏹️  Demo stopped', status: 'stopped' };
  }

  /**
   * Get demo status
   */
  @Get('status')
  getStatus() {
    return {
      isRunning: this.isRunning,
      status: this.isRunning ? '🟢 Running' : '⚫ Stopped',
    };
  }

  /**
   * Process a single demo record on demand (step-by-step mode)
   */
  @Post('step')
  stepDemo() {
    this.generateDemoData();
    return {
      message: '✅ Registro processado',
      lastSnapshot: this.lastSnapshot,
      nextScenario:
        this.demoScenarios[this.demoScenarioIndex % this.demoScenarios.length]?.label,
    };
  }

  /**
   * Exibe o último cenário processado pela demo
   */
  @Get('preview')
  getPreview() {
    return {
      isRunning: this.isRunning,
      lastSnapshot: this.lastSnapshot,
      nextScenario:
        this.demoScenarios[this.demoScenarioIndex % this.demoScenarios.length]
          ?.label,
    };
  }

  /**
   * Generate a single demo data point and process through entire pipeline
   */
  private generateDemoData() {
    const recordId = `DEMO-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const { scenario, validationData } = this.createRandomValidationData();

    this.logger.log(`📊 Processing demo record: ${recordId} | ${scenario}`);

    try {
      // Step 1: Validate the data
      const validationResult = this.validationService.validate(validationData);
      this.logger.log(
        `  ✓ Validation: ${validationResult.status} | Quality: ${validationResult.qualityScore}`,
      );

      // Step 2: Agent decision based on validation
      const agentDecision = this.agentService.evaluateValidation(
        recordId,
        validationResult,
        validationData,
      );

      this.logger.log(
        `  ✓ Agent Decision: ${
          agentDecision.decision
        } | Confidence: ${agentDecision.confidence.toFixed(
          2,
        )}% | Rules: ${agentDecision.rulesApplied.join(', ')}`,
      );

      this.lastSnapshot = {
        recordId,
        scenario,
        input: validationData,
        validation: validationResult,
        agentDecision,
        timestamp: new Date().toISOString(),
      };

      return {
        recordId,
        scenario,
        validation: validationResult,
        agentDecision: agentDecision,
      };
    } catch (error) {
      this.logger.error('❌ Error in demo pipeline:', error);
    }
  }

  /**
   * Create realistic demo data matching ValidationRecordDto
   */
  private createRandomValidationData(): {
    scenario: string;
    validationData: ValidationRecordDto;
  } {
    const scenario =
      this.demoScenarios[this.demoScenarioIndex % this.demoScenarios.length];
    this.demoScenarioIndex += 1;

    const variation = scenario.priceVariationPercent ?? 0;
    const priceMultiplier = 1 + (Math.random() * 2 - 1) * variation;
    const randomPrice = Number(
      (scenario.product.preco * priceMultiplier).toFixed(2),
    );

    return {
      scenario: scenario.label,
      validationData: {
        ...scenario.product,
        preco: randomPrice,
      },
    };
  }
}
