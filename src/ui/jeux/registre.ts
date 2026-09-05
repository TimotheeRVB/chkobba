/**
 * Le catalogue des habillages de cartes.
 *
 * Deux familles cohabitent :
 *   - les habillages dessinés, tracés par le code, toujours disponibles ;
 *   - les jeux d'images, fournis par le joueur sous forme de fichiers.
 *
 * Un habillage est une préférence purement locale : il ne transite jamais par
 * le réseau, et les deux joueurs d'une même partie peuvent en utiliser des
 * différents.
 */

import type { ComponentType } from 'react';
import type { Carte } from '../../jeu';
import { MES_JEUX } from './perso';

/**
 * Un dessin de carte reçoit simplement ses dimensions.
 *
 * Les propriétés sont facultatives et tolérantes : c'est ce que produit
 * react-native-svg-transformer, et ça accepte aussi bien un composant écrit
 * à la main qu'une image enveloppée.
 */
export type DessinCarte = ComponentType<{
  width?: number | string;
  height?: number | string;
  [autre: string]: unknown;
}>;

/** Habillage tracé par le code : le seul réglage est la variante. */
/** L'habillage tracé par le code, toujours disponible. */
export type JeuDessine = {
  id: string;
  nom: string;
  type: 'dessine';
};

/** Habillage fourni en fichiers, indexé par « couleur-valeur ». */
export type JeuImages = {
  id: string;
  nom: string;
  type: 'images';
  faces: Record<string, DessinCarte>;
  dos?: DessinCarte;
};

export type Jeu = JeuDessine | JeuImages;

const DESSINES: JeuDessine[] = [{ id: 'defaut', nom: 'Défaut', type: 'dessine' }];

export const JEUX: Jeu[] = [...DESSINES, ...MES_JEUX];

export const JEU_PAR_DEFAUT = 'defaut';

export function trouverJeu(id: string): Jeu {
  return JEUX.find((j) => j.id === id) ?? DESSINES[0]!;
}

/** Clé d'une carte dans un jeu d'images. */
export const cleCarte = (carte: Carte) => `${carte.couleur}-${carte.valeur}`;

/**
 * Le dessin fourni pour cette carte, s'il existe.
 *
 * Une carte manquante retombe sur l'habillage dessiné : on peut donc essayer
 * un jeu incomplet sans que l'application ne casse.
 */
export function faceDe(jeu: Jeu, carte: Carte): DessinCarte | null {
  return jeu.type === 'images' ? (jeu.faces[cleCarte(carte)] ?? null) : null;
}

export function dosDe(jeu: Jeu): DessinCarte | null {
  return jeu.type === 'images' ? (jeu.dos ?? null) : null;
}

