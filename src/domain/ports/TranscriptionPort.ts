export interface TranscriptionPort {
  transcribeAudio(input: { base64Audio: string; mimeType: string }): Promise<string>;
}
