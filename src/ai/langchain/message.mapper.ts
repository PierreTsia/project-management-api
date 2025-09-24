import { normalizeMultiline } from '../utils/text.utils';

export type LangchainRole = 'system' | 'user' | 'ai';

export type LangchainMessage = {
  role: LangchainRole;
  content: string;
};

export type BuildMessagesInput = {
  system: string;
  user: string;
  ai?: string;
};

export function buildMessages(
  input: BuildMessagesInput,
): ReadonlyArray<LangchainMessage> {
  const systemContent = normalizeMultiline(input.system);
  const userContent = normalizeMultiline(input.user);
  const base: LangchainMessage[] = [
    { role: 'system', content: systemContent },
    { role: 'user', content: userContent },
  ];
  if (!input.ai) return base;
  const aiContent = normalizeMultiline(input.ai);
  return [...base, { role: 'ai', content: aiContent }];
}
