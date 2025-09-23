import { Injectable } from '@nestjs/common';
import { ProjectContext } from './context/models/project-context.model';

interface RedactedProject {
  id: string;
  name: string;
}

@Injectable()
export class AiRedactionService {
  sanitizeText(input: string, env: string): string {
    if (!input) return '';
    if (env === 'production') return '[REDACTED]';
    const masked = input
      .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[EMAIL]')
      .replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[PHONE]')
      .replace(/(Bearer|apikey|token)\s+[A-Za-z0-9._-]+/gi, '$1 [SECRET]');
    return masked.slice(0, 512);
  }

  redactProject(project: ProjectContext): RedactedProject {
    return {
      id: project.id,
      name: this.sanitizeText(
        project.name,
        process.env.NODE_ENV || 'development',
      ),
    };
  }
}
