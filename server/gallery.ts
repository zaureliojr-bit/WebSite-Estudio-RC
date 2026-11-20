export const galleryColors = ['Preto', 'Castanho escuro', 'Castanho', 'Chocolate', 'Morena iluminada', 'Loiro', 'Ruivo', 'Mechas', 'Outras cores'] as const;

export type GalleryPhoto = {
  id: string;
  color: typeof galleryColors[number];
  caption: string;
  image: string;
  created: string;
};
