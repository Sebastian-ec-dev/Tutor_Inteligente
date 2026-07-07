import { PrivacyFilterPort } from '../../domain/ports/PrivacyFilterPort';

const SENSITIVE_PATTERNS: RegExp[] = [
  /\b(contraseña|clave|password|pass)\s*(es|:|=)?\s*[^\s,.;]+/gi,
  /\b(usuario|user|username)\s*(es|:|=)?\s*[^\s,.;]+/gi,
  /\b(correo|email|mail)\s*(es|:|=)?\s*[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi,
  /[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi,
  /\b\d{10}\b/g,
  /\b\d{9,13}\b/g,
  /\b(teléfono|telefono|celular)\s*(es|:|=)?\s*[+\d][\d\s-]{6,}/gi,
];

const INAPPROPRIATE_WORDS: RegExp[] = [
  /\b(mierda|puta|puto|carajo|verga)\b/gi,
];

export class RegexPrivacyFilter implements PrivacyFilterPort {
  clean(text: string): string {
    let cleanText = text || '';

    [...SENSITIVE_PATTERNS, ...INAPPROPRIATE_WORDS].forEach((pattern) => {
      cleanText = cleanText.replace(pattern, '');
    });

    return cleanText
      .replace(/\[DATO SENSIBLE ELIMINADO\]/gi, '')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  containsSensitiveData(text: string): boolean {
    return [...SENSITIVE_PATTERNS, ...INAPPROPRIATE_WORDS].some((pattern) => {
      pattern.lastIndex = 0;
      return pattern.test(text);
    });
  }
}
