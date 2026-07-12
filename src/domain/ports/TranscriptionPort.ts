export type TranscriptionInput = {
  audioUri: string;
  mimeType: string;
  fileName?: string;
  getBase64Audio?: () => Promise<string>;
};

export interface TranscriptionPort {
  transcribeAudio(input: TranscriptionInput): Promise<string>;
}
