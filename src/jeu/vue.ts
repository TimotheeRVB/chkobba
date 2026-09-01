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

import type { Carte } from './cartes';
import { type Etat, type Joueur, autre } from './etat';
import type { Coup } from './regles';

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
  readonly dernierCoup?: {
    readonly joueur: Joueur;
    readonly carte: Carte;
    readonly prise: readonly Carte[];
  };
};

/** Construit ce que le joueur donné a le droit de voir. */
export function vuePour(
  etat: Etat,
  moi: Joueur,
  dernierCoup?: { joueur: Joueur; carte: Carte; prise: readonly Carte[] },
): Vue {
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
