/**
 * La vue d'un joueur.
 *
 * En ligne, l'état complet ne quitte jamais le serveur. Chaque client reçoit
 * une Vue : sa propre main, la table, et de simples nombres pour tout ce qui
 * est caché. Les cartes de l'adversaire et celles de la pioche n'existent
 * nulle part dans ce qui transite sur le réseau.
 *
 * C'est une garantie structurelle, pas un masquage d'affichage : même en
 * inspectant le trafic, un joueur ne peut pas apprendre ce qu'il ne doit
 * pas savoir.
 */

import { type Carte, memeCarte } from './cartes';
import { type Etat, type Joueur, autre, donneTerminee } from './etat';
import type { Coup } from './regles';

/** Le ramassage des cartes restées sur le tapis en fin de donne. */
export type Balayage = {
  readonly joueur: Joueur;
  readonly cartes: readonly Carte[];
};

/** Ce qui vient d'être joué, tel qu'on l'annonce aux deux joueurs. */
export type CoupAnnonce = {
  readonly joueur: Joueur;
  readonly carte: Carte;
  readonly prise: readonly Carte[];
  /** Présent uniquement sur le dernier coup d'une donne. */
  readonly balayage?: Balayage;
};

/**
 * Les cartes que le dernier ramasseur emporte en fin de donne.
 *
 * Ce ramassage a lieu à l'intérieur d'appliquerCoup, donc l'état d'arrivée ne
 * porte plus trace de ce qui a été balayé ni d'où ça venait. On le reconstitue
 * ici, en comparant le tapis d'avant au coup joué.
 */
export function balayageFinal(
  avant: Etat,
  coup: Coup,
  apres: Etat,
): Balayage | null {
  if (!donneTerminee(apres) || apres.dernierRamasseur === null) return null;

  const cartes = [
    ...avant.table.filter((c) => !coup.prise.some((p) => memeCarte(p, c))),
    // Une carte simplement posée reste sur le tapis et part avec le reste.
    ...(coup.prise.length === 0 ? [coup.carte] : []),
  ];

  return cartes.length > 0 ? { joueur: apres.dernierRamasseur, cartes } : null;
}

export type Vue = {
  /** Qui regarde. */
  readonly moi: Joueur;

  /** Visible : la main du joueur et le tapis. */
  readonly maMain: readonly Carte[];
  readonly table: readonly Carte[];

  /** Ses propres plis, qu'il peut consulter à tout moment. */
  readonly mesRamassees: readonly Carte[];

  /** Caché : seuls les effectifs sont transmis. */
  readonly cartesAdversaire: number;
  readonly ramasseesAdversaire: number;
  readonly pioche: number;

  /** Public : tout le monde a le droit de le savoir. */
  readonly chkobbas: readonly [number, number];
  readonly scores: readonly [number, number];
  readonly donneur: Joueur;
  readonly aMoiDeJouer: boolean;

  /** Le coup précédent, pour l'afficher. Absent au tout début d'une donne. */
  readonly dernierCoup?: CoupAnnonce;
};

/** Construit ce que le joueur donné a le droit de voir. */
export function vuePour(etat: Etat, moi: Joueur, dernierCoup?: CoupAnnonce): Vue {
  const lui = autre(moi);

  return {
    moi,
    maMain: etat.mains[moi],
    table: etat.table,
    mesRamassees: etat.ramassees[moi],
    cartesAdversaire: etat.mains[lui].length,
    ramasseesAdversaire: etat.ramassees[lui].length,
    pioche: etat.pioche.length,
    chkobbas: etat.chkobbas,
    scores: etat.scores,
    donneur: etat.donneur,
    aMoiDeJouer: etat.joueurCourant === moi,
    ...(dernierCoup ? { dernierCoup } : {}),
  };
}

/**
 * Toutes les cartes contenues dans une structure, à n'importe quelle
 * profondeur. Sert aux tests d'étanchéité : on vérifie qu'aucune carte
 * interdite ne se cache dans ce qu'on envoie.
 */
export function cartesContenues(valeur: unknown, trouvees: Carte[] = []): Carte[] {
  if (valeur === null || typeof valeur !== 'object') return trouvees;

  if (Array.isArray(valeur)) {
    for (const element of valeur) cartesContenues(element, trouvees);
    return trouvees;
  }

  const objet = valeur as Record<string, unknown>;
  if (typeof objet.couleur === 'string' && typeof objet.valeur === 'number') {
    trouvees.push(objet as unknown as Carte);
    return trouvees;
  }

  for (const element of Object.values(objet)) cartesContenues(element, trouvees);
  return trouvees;
}

/** Le coup, tel qu'un client l'envoie au serveur. */
export type CoupEnvoye = Coup;
