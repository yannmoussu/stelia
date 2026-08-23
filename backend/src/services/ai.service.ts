import type { Consultation } from '../domain/models/consultation';

export interface IAIService {
  structureTranscript(transcript: string): Promise<Partial<Consultation>>;
}
