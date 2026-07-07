export interface PrivacyFilterPort {
  clean(text: string): string;
  containsSensitiveData(text: string): boolean;
}
