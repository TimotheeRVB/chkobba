/**
 * L'exécution d'un coup.
 *
 * `appliquerCoup` est la seule fonction qui fait avancer une partie. Elle ne
 * modifie jamais l'état reçu : elle en construit un nouveau.
 *
 * Elle prend aussi en charge l'enchaînement automatique :
 *   - quand les deux mains sont vides et la pioche non, on redistribue ;
 *   - quand la donne se termine, les cartes restantes vont au dernier ramasseur.
 */

import { type Carte, memeCarte, nomCarte } from './cartes';
import {
  type Etat,
  autre,
  mainsVides,
  redistribuerMains,
} from './etat';
import { type Coup, coupsLegaux, nomCoup } from './regles';

/** Retire une carte d'une liste. Lève une erreur si elle n'y est pas. */
function retirerUne(liste: readonly Carte[], carte: Carte): Carte[] {
  const index = liste.findIndex((c) => memeCarte(c, carte));
  if (index === -1) {
    throw new Error(`Carte absente : ${nomCarte(carte)}`);
  }
  return [...liste.slice(0, index), ...liste.slice(index + 1)];
}

/** Retire plusieurs cartes d'une liste, une occurrence chacune. */
function retirerPlusieurs(
  liste: readonly Carte[],
  cartes: readonly Carte[],
): Carte[] {
  let reste = [...liste];
  for (const carte of cartes) {
    reste = retirerUne(reste, carte);
  }
  return reste;
}

/** Signature textuelle d'un coup, pour comparer deux coups sans l'ordre. */
function signature(coup: Coup): string {
  const prise = coup.prise.map(nomCarte).sort().join('+');
  return `${nomCarte(coup.carte)}>${prise}`;
}

/** Le coup fait-il partie des coups autorisés ? */
export function estCoupLegal(etat: Etat, coup: Coup): boolean {
  const attendue = signature(coup);
  return coupsLegaux(etat).some((legal) => signature(legal) === attendue);
}

/**
 * Est-ce le tout dernier coup de la donne ?
 *
 * C'est le cas quand la pioche est vide, que l'adversaire n'a plus de carte,
 * et que celle-ci est la dernière du joueur courant. La chkobba ne compte pas
 * sur ce coup-là.
 */
function estDernierCoupDeLaDonne(etat: Etat): boolean {
  return (
    etat.pioche.length === 0 &&
    etat.mains[etat.joueurCourant].length === 1 &&
    etat.mains[autre(etat.joueurCourant)].length === 0
  );
}

/** Joue un coup et renvoie le nouvel état. */
export function appliquerCoup(etat: Etat, coup: Coup): Etat {
  if (!estCoupLegal(etat, coup)) {
    throw new Error(`Coup interdit : ${nomCoup(coup)}`);
  }

  const joueur = etat.joueurCourant;
  const dernierCoup = estDernierCoupDeLaDonne(etat);

  const mains: [Carte[], Carte[]] = [[...etat.mains[0]], [...etat.mains[1]]];
  mains[joueur] = retirerUne(mains[joueur], coup.carte);

  const ramassees: [Carte[], Carte[]] = [
    [...etat.ramassees[0]],
    [...etat.ramassees[1]],
  ];
  const chkobbas: [number, number] = [etat.chkobbas[0], etat.chkobbas[1]];

  let table: Carte[];
  let dernierRamasseur = etat.dernierRamasseur;

  if (coup.prise.length > 0) {
    table = retirerPlusieurs(etat.table, coup.prise);
    ramassees[joueur] = [...ramassees[joueur], coup.carte, ...coup.prise];
    dernierRamasseur = joueur;

    // Balayage : la table est vide, sauf si c'est le dernier coup de la donne.
    if (table.length === 0 && !dernierCoup) {
      chkobbas[joueur] += 1;
    }
  } else {
    table = [...etat.table, coup.carte];
  }

  let suivant: Etat = {
    ...etat,
    table,
    mains,
    ramassees,
    chkobbas,
    dernierRamasseur,
    joueurCourant: autre(joueur),
  };

  if (mainsVides(suivant)) {
    if (suivant.pioche.length > 0) {
      suivant = redistribuerMains(suivant);
    } else {
      suivant = ramasserLaTable(suivant);
    }
  }

  return suivant;
}

/**
 * Fin de donne : les cartes restées sur la table vont au dernier joueur ayant
 * pris. Ce ramassage n'est jamais une chkobba.
 */
function ramasserLaTable(etat: Etat): Etat {
  if (etat.table.length === 0 || etat.dernierRamasseur === null) {
    return etat;
  }

  const ramassees: [Carte[], Carte[]] = [
    [...etat.ramassees[0]],
    [...etat.ramassees[1]],
  ];
  ramassees[etat.dernierRamasseur] = [
    ...ramassees[etat.dernierRamasseur],
    ...etat.table,
  ];

  return { ...etat, table: [], ramassees };
}
