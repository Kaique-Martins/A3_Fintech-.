import { Module, forwardRef } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { DemoController } from './demo.controller';
import { ExplainabilityController } from './explainability.controller';
import { AgentSchedulerService } from './agent-scheduler.service';
import { LearningService } from './learning.service';
import { DecisionExplanationService } from './services/decision-explanation.service';
import { AgentFeedbackService } from './services/agent-feedback.service';
import { AgentEvolutionService } from './services/agent-evolution.service';
import { AgentAnomalyDetectorService } from './services/agent-anomaly-detector.service';
import { ValidationModule } from '../validation/validation.module';
import { DatabaseModule } from '../database/database.module';
import { TrainingModule } from '../training/training.module';

@Module({
  imports: [forwardRef(() => ValidationModule), DatabaseModule, TrainingModule],
  providers: [
    AgentService,
    AgentSchedulerService,
    LearningService,
    DecisionExplanationService,
    AgentFeedbackService,
    AgentEvolutionService,
    AgentAnomalyDetectorService,
  ],
  controllers: [AgentController, DemoController, ExplainabilityController],
  exports: [
    AgentService,
    DecisionExplanationService,
    AgentFeedbackService,
    AgentEvolutionService,
    AgentAnomalyDetectorService,
  ],
})
export class AgentModule {}
