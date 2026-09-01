/**
 * Les règles de prise de la chkobba.
 *
 * Deux principes, dans cet ordre strict :
 *   1. Si une carte de la table a la même valeur, on la prend, et les
 *      combinaisons sont interdites.
 *   2. Sinon, on prend une combinaison de cartes dont la somme correspond.
 *   3. La prise est obligatoire dès qu'elle est possible.
 */

import { type Carte, nomCarte } from './cartes';
import type { Etat } from './etat';

export type Coup = {
  /** La carte jouée depuis la main. */
  readonly carte: Carte;
  /** Les cartes ramassées. Tableau vide si la carte est simplement posée. */
  readonly prise: readonly Carte[];
};

/**
 * Toutes les combinaisons d'au moins deux cartes de la table dont la somme
 * vaut exactement `cible`.
 *
 * On explore les cartes de gauche à droite. À chaque étape on essaie
 * d'inclure la carte courante puis on passe à la suivante — c'est ce qu'on
 * appelle un parcours en profondeur avec retour arrière.
 *
 * L'élagage tient dans une seule ligne : une carte dont la valeur dépasse ce
 * qu'il reste à atteindre est ignorée. Comme les valeurs vont de 1 à 10 et que
 * la cible ne dépasse jamais 10, les branches explorées restent minuscules,
 * même avec une grande table.
 */
export function combinaisons(
  table: readonly Carte[],
  cible: number,
): Carte[][] {
  const resultats: Carte[][] = [];
  const courante: Carte[] = [];

  function explorer(depuis: number, restant: number): void {
    if (restant === 0) {
      if (courante.length >= 2) resultats.push([...courante]);
      return;
    }

    for (let i = depuis; i < table.length; i++) {
      const carte = table[i]!;
      if (carte.valeur > restant) continue;

      courante.push(carte);
      explorer(i + 1, restant - carte.valeur);
      courante.pop();
    }
  }

  explorer(0, cible);
  return resultats;
}

/**
 * Toutes les prises autorisées pour une carte de valeur `valeur`.
 * Renvoie un tableau vide si aucune prise n'est possible.
 *
 * C'est ici que s'applique la priorité de la correspondance exacte : dès
 * qu'une carte de même valeur est sur la table, les combinaisons ne sont même
 * pas calculées.
 */
export function prisesPossibles(
  table: readonly Carte[],
  valeur: number,
): Carte[][] {
  const exactes = table.filter((carte) => carte.valeur === valeur);
  if (exactes.length > 0) {
    return exactes.map((carte) => [carte]);
  }

  return combinaisons(table, valeur);
}

/**
 * Tous les coups autorisés pour le joueur dont c'est le tour.
 *
 * Une carte qui permet une prise n'apparaît jamais comme simple pose : la
 * prise est obligatoire. Une carte qui permet plusieurs prises différentes
 * apparaît autant de fois qu'il y a de choix.
 */
export function coupsLegaux(etat: Etat): Coup[] {
  return coupsPour(etat.table, etat.mains[etat.joueurCourant]);
}

/**
 * Les coups autorisés pour une main donnée face à une table donnée.
 *
 * Cette variante ne demande pas l'état complet de la partie : un client en
 * ligne, qui ne connaît que sa propre main, peut donc calculer lui-même ce
 * qu'il a le droit de jouer.
 */
export function coupsPour(
  table: readonly Carte[],
  main: readonly Carte[],
): Coup[] {
  const coups: Coup[] = [];

  for (const carte of main) {
    const prises = prisesPossibles(table, carte.valeur);

    if (prises.length === 0) {
      coups.push({ carte, prise: [] });
    } else {
      for (const prise of prises) {
        coups.push({ carte, prise });
      }
    }
  }

  return coups;
}

/** Un coup vide-t-il la table ? Sert à détecter les chkobbas. */
export function videLaTable(etat: Etat, coup: Coup): boolean {
  return coup.prise.length > 0 && coup.prise.length === etat.table.length;
}

/** Description lisible d'un coup : "7♥ prend 3♦ + 4♠" ou "7♥ posé". */
export function nomCoup(coup: Coup): string {
  if (coup.prise.length === 0) {
    return `${nomCarte(coup.carte)} posé`;
  }
  return `${nomCarte(coup.carte)} prend ${coup.prise.map(nomCarte).join(' + ')}`;
}
