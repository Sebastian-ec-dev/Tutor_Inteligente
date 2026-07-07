export type ClassContentType = 'theory' | 'math' | 'image' | 'general';

export const CLASS_CONTENT_LABELS: Record<ClassContentType, string> = {
  theory: 'Contenido teórico / conceptual',
  math: 'Contenido matemático / ejercicios',
  image: 'Contenido visual / imágenes',
  general: 'Contenido general',
};
