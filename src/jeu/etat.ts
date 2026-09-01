/**
 * L'état d'une partie et sa mise en place.
 *
 * Ce module sait distribuer les cartes, mais ne connaît pas encore les prises.
 * Les règles de jeu viendront dans le module suivant.
 */

import { type Carte, paquetComplet, melanger } from './cartes';

/** Les deux joueurs sont désignés par 0 et 1. */
export type Joueur = 0 | 1;

export type Etat = {
  /** Cartes non encore distribuées. */
  readonly pioche: readonly Carte[];
  /** Cartes en main, indexées par joueur. */
  readonly mains: readonly [readonly Carte[], readonly Carte[]];
  /** Cartes face visible au centre. */
  readonly table: readonly Carte[];
  /** Cartes gagnées pendant la donne en cours. */
  readonly ramassees: readonly [readonly Carte[], readonly Carte[]];
  /** Dernier joueur ayant pris. Null tant que personne n'a pris. */
  readonly dernierRamasseur: Joueur | null;
  /** Balayages réalisés pendant la donne en cours. */
  readonly chkobbas: readonly [number, number];
  /** Score cumulé de la partie. Jamais remis à zéro. */
  readonly scores: readonly [number, number];
  /** Joueur qui distribue cette donne. */
  readonly donneur: Joueur;
  /** À qui de jouer. */
  readonly joueurCourant: Joueur;
};

/** L'autre joueur. */
export function autre(joueur: Joueur): Joueur {
  return joueur === 0 ? 1 : 0;
}

/** Nombre de points nécessaires pour gagner. */
export const POINTS_POUR_GAGNER = 21;

const CARTES_EN_MAIN = 3;
const CARTES_SUR_TABLE = 4;

/**
 * Met en place une donne : mélange, 4 cartes sur table, 3 en main chacun.
 * Le joueur qui n'est pas le donneur entame.
 */
function distribuerDonne(
  scores: readonly [number, number],
  donneur: Joueur,
  graine?: number,
): Etat {
  const paquet = melanger(paquetComplet(), graine);

  const table = paquet.slice(0, CARTES_SUR_TABLE);
  const main0 = paquet.slice(CARTES_SUR_TABLE, CARTES_SUR_TABLE + CARTES_EN_MAIN);
  const main1 = paquet.slice(
    CARTES_SUR_TABLE + CARTES_EN_MAIN,
    CARTES_SUR_TABLE + 2 * CARTES_EN_MAIN,
  );
  const pioche = paquet.slice(CARTES_SUR_TABLE + 2 * CARTES_EN_MAIN);

  return {
    pioche,
    mains: [main0, main1],
    table,
    ramassees: [[], []],
    dernierRamasseur: null,
    chkobbas: [0, 0],
    scores,
    donneur,
    joueurCourant: autre(donneur),
  };
}

/** Nouvelle partie : scores à zéro, première donne distribuée. */
export function nouvellePartie(graine?: number): Etat {
  return distribuerDonne([0, 0], 0, graine);
}

/**
 * Donne suivante : les scores sont conservés, le donneur change de camp,
 * tout le reste est remis à zéro.
 */
export function donneSuivante(etat: Etat, graine?: number): Etat {
  return distribuerDonne(etat.scores, autre(etat.donneur), graine);
}

/** Les deux joueurs ont-ils la main vide ? */
export function mainsVides(etat: Etat): boolean {
  return etat.mains[0].length === 0 && etat.mains[1].length === 0;
}

/**
 * Redistribue 3 cartes à chaque joueur depuis la pioche.
 * Aucune carte n'est ajoutée sur la table.
 */
export function redistribuerMains(etat: Etat): Etat {
  const main0 = etat.pioche.slice(0, CARTES_EN_MAIN);
  const main1 = etat.pioche.slice(CARTES_EN_MAIN, 2 * CARTES_EN_MAIN);

  return {
    ...etat,
    pioche: etat.pioche.slice(2 * CARTES_EN_MAIN),
    mains: [main0, main1],
  };
}

/** La donne est-elle finie ? Pioche épuisée et plus une carte en main. */
export function donneTerminee(etat: Etat): boolean {
  return etat.pioche.length === 0 && mainsVides(etat);
}

/**
 * Les 40 cartes sont-elles toutes présentes, exactement une fois ?
 *
 * À appeler après chaque coup pendant le développement. C'est le filet de
 * sécurité le plus rentable du projet : une carte dupliquée ou disparue est
 * invisible dans l'interface, mais fausse tout le décompte final.
 *
 * Lève une erreur explicite si l'invariant est rompu.
 */
export function verifierIntegrite(etat: Etat): void {
  const toutes: Carte[] = [
    ...etat.pioche,
    ...etat.mains[0],
    ...etat.mains[1],
    ...etat.table,
    ...etat.ramassees[0],
    ...etat.ramassees[1],
  ];

  if (toutes.length !== 40) {
    throw new Error(`Intégrité rompue : ${toutes.length} cartes au lieu de 40.`);
  }

  const identifiants = new Set(toutes.map((c) => `${c.couleur}-${c.valeur}`));
  if (identifiants.size !== 40) {
    throw new Error(
      `Intégrité rompue : ${40 - identifiants.size} carte(s) en double.`,
    );
  }
}
