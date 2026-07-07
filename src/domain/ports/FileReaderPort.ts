export interface FileReaderPort {
  readAsBase64(uri: string): Promise<string>;
}
