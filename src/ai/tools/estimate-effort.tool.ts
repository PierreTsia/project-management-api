import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { z } from 'zod';

const EstimateEffortInputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  complexity: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
});

const EstimateEffortOutputSchema = z.object({
  estimatedHours: z.number().min(0.5).max(40),
  confidence: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  reasoning: z.string().max(200),
});

@Injectable()
export class EstimateEffortTool {
  @Tool({ name: 'estimate_effort' })
  async estimateEffort(
    params: z.infer<typeof EstimateEffortInputSchema>,
  ): Promise<z.infer<typeof EstimateEffortOutputSchema>> {
    const {
      title,
      description = '',
      complexity = 'MEDIUM',
    } = EstimateEffortInputSchema.parse(params);

    // Simple heuristic-based estimation
    const text = `${title} ${description}`.toLowerCase();
    let baseHours = 2; // Default 2 hours

    // Adjust based on complexity keywords
    if (
      text.includes('setup') ||
      text.includes('configure') ||
      text.includes('install')
    ) {
      baseHours = complexity === 'HIGH' ? 8 : complexity === 'MEDIUM' ? 4 : 2;
    } else if (
      text.includes('implement') ||
      text.includes('develop') ||
      text.includes('build')
    ) {
      baseHours = complexity === 'HIGH' ? 16 : complexity === 'MEDIUM' ? 8 : 4;
    } else if (
      text.includes('test') ||
      text.includes('debug') ||
      text.includes('fix')
    ) {
      baseHours = complexity === 'HIGH' ? 12 : complexity === 'MEDIUM' ? 6 : 3;
    } else if (
      text.includes('review') ||
      text.includes('analyze') ||
      text.includes('research')
    ) {
      baseHours = complexity === 'HIGH' ? 6 : complexity === 'MEDIUM' ? 3 : 1.5;
    }

    // Adjust based on complexity level
    const multiplier =
      complexity === 'HIGH' ? 1.5 : complexity === 'MEDIUM' ? 1 : 0.7;
    const estimatedHours = Math.round(baseHours * multiplier * 2) / 2; // Round to nearest 0.5

    return {
      estimatedHours: Math.min(estimatedHours, 40), // Cap at 40 hours
      confidence: complexity === 'HIGH' ? 'LOW' : 'MEDIUM',
      reasoning: `Based on "${title}" (${complexity} complexity): ${baseHours}h base × ${multiplier} multiplier`,
    };
  }
}
