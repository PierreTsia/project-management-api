import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { z } from 'zod';

const NormalizeTitleInputSchema = z.object({
  title: z.string().min(1).max(200),
});

const NormalizeTitleOutputSchema = z.object({
  normalized: z.string().min(1).max(80),
  originalLength: z.number(),
  wasTruncated: z.boolean(),
});

@Injectable()
export class NormalizeTitleTool {
  @Tool({ name: 'normalize_title' })
  async normalizeTitle(
    params: z.infer<typeof NormalizeTitleInputSchema>,
  ): Promise<z.infer<typeof NormalizeTitleOutputSchema>> {
    const { title } = NormalizeTitleInputSchema.parse(params);

    // Normalize: trim, collapse whitespace, remove extra punctuation
    const normalized = title
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[.!?]+$/, '')
      .slice(0, 80);

    return {
      normalized,
      originalLength: title.length,
      wasTruncated: title.length > 80,
    };
  }
}
