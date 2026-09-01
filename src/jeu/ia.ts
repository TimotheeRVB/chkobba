/**
 * Une IA par évaluation de coups.
 *
 * Le principe est simple : on note chaque coup légal avec une somme pondérée
 * de critères, et on joue le mieux noté. Pas d'anticipation, pas d'exploration
 * de l'arbre des possibles — juste un jugement sur la position immédiate.
 *
 * Les poids sont regroupés dans POIDS pour être réglés facilement. Chaque
 * modification se mesure en faisant s'affronter deux versions sur quelques
 * milliers de parties.
 */

import { type Carte, memeCarte, HAYA } from './cartes';
import type { Etat } from './etat';
import { type Coup, coupsLegaux, prisesPossibles } from './regles';

export type Poids = {
  /** Par carte ramassée : nourrit le point de karta. */
  carte: number;
  /** Par denier ramassé. */
  denier: number;
  /** Par 7 ramassé : nourrit la barmila. */
  sept: number;
  /** Par 6 ramassé : sert au départage de la barmila. */
  six: number;
  /** Bonus pour le 7 de deniers, le seul point garanti de chaque donne. */
  haya: number;
  /** Bonus pour un balayage. */
  chkobba: number;
  /** Malus quand le coup laisse une table que l'adversaire peut balayer. */
  risque: number;
};

export const POIDS: Poids = {
  carte: 1,
  denier: 3,
  sept: 4,
  six: 1,
  haya: 12,
  chkobba: 15,
  risque: 4,
};

/**
 * La table peut-elle être balayée d'une seule carte ?
 *
 * On teste les dix valeurs possibles et on regarde si l'une d'elles permet
 * de tout ramasser. C'est le critère défensif de l'IA : laisser une table
 * balayable offre un point à l'adversaire.
 */
export function estBalayable(table: readonly Carte[]): boolean {
  if (table.length === 0) return false;

  for (let valeur = 1; valeur <= 10; valeur++) {
    const prises = prisesPossibles(table, valeur);
    if (prises.some((prise) => prise.length === table.length)) return true;
  }

  return false;
}

/** Valeur des cartes qu'un coup fait gagner ou perdre. */
function valeurDesCartes(cartes: readonly Carte[], poids: Poids): number {
  let score = 0;

  for (const carte of cartes) {
    score += poids.carte;
    if (carte.couleur === 'deniers') score += poids.denier;
    if (carte.valeur === 7) score += poids.sept;
    if (carte.valeur === 6) score += poids.six;
    if (memeCarte(carte, HAYA)) score += poids.haya;
  }

  return score;
}

/** Note d'un coup. Plus c'est haut, mieux c'est. */
export function evaluerCoup(etat: Etat, coup: Coup, poids: Poids = POIDS): number {
  let score = 0;
  let tableApres: Carte[];

  if (coup.prise.length > 0) {
    // La carte jouée rejoint les plis avec la prise : elle compte aussi.
    score += valeurDesCartes([coup.carte, ...coup.prise], poids);

    tableApres = etat.table.filter(
      (c) => !coup.prise.some((p) => memeCarte(p, c)),
    );

    if (tableApres.length === 0) score += poids.chkobba;
  } else {
    // Poser une carte, c'est l'offrir à l'adversaire. On préfère se séparer
    // des cartes sans valeur de décompte.
    score -= valeurDesCartes([coup.carte], poids);
    tableApres = [...etat.table, coup.carte];
  }

  if (estBalayable(tableApres)) score -= poids.risque;

  return score;
}

/**
 * Choisit le meilleur coup selon l'évaluation.
 * À égalité de note, le premier coup rencontré l'emporte.
 */
export function choisirCoup(etat: Etat, poids: Poids = POIDS): Coup {
  const coups = coupsLegaux(etat);

  let meilleur = coups[0]!;
  let meilleureNote = evaluerCoup(etat, meilleur, poids);

  for (const coup of coups.slice(1)) {
    const note = evaluerCoup(etat, coup, poids);
    if (note > meilleureNote) {
      meilleur = coup;
      meilleureNote = note;
    }
  }

  return meilleur;
}

/** Adversaire de référence : joue au hasard. Sert d'étalon de mesure. */
export function choisirAuHasard(etat: Etat): Coup {
  const coups = coupsLegaux(etat);
  return coups[Math.floor(Math.random() * coups.length)]!;
}
