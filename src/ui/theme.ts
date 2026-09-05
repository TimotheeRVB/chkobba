/**
 * Palette et libellés partagés par l'interface.
 *
 * L'ambiance visée est celle d'un café tunisien le soir : murs bleus de Sidi
 * Bou Saïd, zellige en fond, plateau de laiton et tapis de jeu vert.
 */

import type { Couleur } from '../jeu';

export const PALETTE = {
  /** Le bleu des murs, fond de toute l'application. */
  nuit: '#0a2233',
  /** Une nuance plus claire, pour le motif de zellige. */
  azur: '#1d4d6b',

  /** Le tapis de jeu. */
  tapis: '#12564a',
  tapisFonce: '#0b3a32',

  /** Le laiton du plateau et des accents. */
  laiton: '#c08a2e',
  laitonPale: 'rgba(192,138,46,0.35)',

  /** L'ivoire des cartes et du texte. */
  ivoire: '#f2e6cc',
  sable: 'rgba(242,230,204,0.62)',
  bordure: 'rgba(242,230,204,0.16)',
};

export const COULEURS_TEXTE: Record<Couleur, string> = {
  deniers: 'carreau',
  coupes: 'cœur',
  epees: 'pique',
  batons: 'trèfle',
};
