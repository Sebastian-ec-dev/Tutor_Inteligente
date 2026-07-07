import * as FileSystem from 'expo-file-system/legacy';
import { FileReaderPort } from '../../domain/ports/FileReaderPort';

export class ExpoFileReaderAdapter implements FileReaderPort {
  async readAsBase64(uri: string): Promise<string> {
    return FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
  }
}
