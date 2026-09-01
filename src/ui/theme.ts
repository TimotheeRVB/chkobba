/** Palette et libellés partagés par l'interface. */

import type { Couleur } from '../jeu';

export const PALETTE = {
  nuit: '#0c2730',
  tapis: '#11554d',
  tapisFonce: '#0a3b36',
  ivoire: '#f0e2c4',
  sable: 'rgba(240,226,196,0.6)',
  laiton: '#c8912f',
  bordure: 'rgba(240,226,196,0.16)',
};

export const COULEURS_TEXTE: Record<Couleur, string> = {
  deniers: 'carreau',
  coupes: 'cœur',
  epees: 'pique',
  batons: 'trèfle',
};
