import { Injectable } from '@nestjs/common';
import { LangchainProvider } from './providers/langchain.provider';
import { AiProvider } from './provider.types';

@Injectable()
export class ProviderFactory {
  constructor(private readonly langchain: LangchainProvider) {}

  get(): AiProvider {
    return this.langchain;
  }
}
