export function splitTextIntoChunks(text: string, chunkSize = 1000): string[] {
  const normalized = text.trim();
  if (!normalized) return [];

  const chunks = normalized.match(new RegExp(`(.|[\\r\\n]){1,${chunkSize}}`, 'g')) || [normalized];
  return chunks.map((chunk) => chunk.trim()).filter(Boolean);
}

export function buildAudioEmbeddingChunks(input: {
  title: string;
  summary: string;
  transcript: string;
  chunkSize?: number;
}): string[] {
  const chunkSize = input.chunkSize || 1000;
  const baseTitle = `Título del apunte: ${input.title.trim()}`;

  const summaryChunks = splitTextIntoChunks(input.summary, chunkSize).map(
    (chunk, index) => `${baseTitle}\nFuente: resumen\nFragmento: ${index + 1}\n\n${chunk}`,
  );

  const transcriptChunks = splitTextIntoChunks(input.transcript, chunkSize).map(
    (chunk, index) => `${baseTitle}\nFuente: transcripción\nFragmento: ${index + 1}\n\n${chunk}`,
  );

  return [...summaryChunks, ...transcriptChunks].filter((chunk) => chunk.trim().length > 0);
}
