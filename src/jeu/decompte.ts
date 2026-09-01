/**
 * Le décompte d'une donne.
 *
 * Quatre points de catégorie, plus un point par chkobba :
 *   - karta   : majorité des cartes (plus de 20 sur 40)
 *   - dineri  : majorité des deniers (plus de 5 sur 10)
 *   - haya    : le 7 de deniers
 *   - barmila : le plus de 7, départage au nombre de 6
 *
 * En cas d'égalité sur karta, dineri ou barmila, personne ne marque.
 */

import { type Carte, memeCarte, HAYA } from './cartes';
import { type Etat, type Joueur, POINTS_POUR_GAGNER, autre } from './etat';

export type Categorie = 'karta' | 'dineri' | 'haya' | 'barmila';

export type Detail = {
  readonly categorie: Categorie;
  readonly vainqueur: Joueur | null;
  /** Le décompte brut de chaque joueur, pour l'affichage. */
  readonly compte: readonly [number, number];
};

export type Decompte = {
  readonly details: readonly Detail[];
  readonly chkobbas: readonly [number, number];
  readonly points: readonly [number, number];
};

/** Qui a le plus grand nombre ? Null si égalité. */
function majorite(a: number, b: number): Joueur | null {
  if (a > b) return 0;
  if (b > a) return 1;
  return null;
}

function compterSi(
  ramassees: readonly [readonly Carte[], readonly Carte[]],
  predicat: (carte: Carte) => boolean,
): [number, number] {
  return [
    ramassees[0].filter(predicat).length,
    ramassees[1].filter(predicat).length,
  ];
}

/**
 * Le point de barmila : le plus de 7. En cas d'égalité on compte les 6,
 * et si l'égalité persiste personne ne marque.
 */
function barmila(
  ramassees: readonly [readonly Carte[], readonly Carte[]],
): Detail {
  const sept = compterSi(ramassees, (c) => c.valeur === 7);
  const surLesSept = majorite(sept[0], sept[1]);
  if (surLesSept !== null) {
    return { categorie: 'barmila', vainqueur: surLesSept, compte: sept };
  }

  const six = compterSi(ramassees, (c) => c.valeur === 6);
  return {
    categorie: 'barmila',
    vainqueur: majorite(six[0], six[1]),
    compte: sept,
  };
}

/**
 * Compte les points d'une donne terminée.
 * À n'appeler qu'après `donneTerminee(etat)`, quand les 40 cartes sont
 * réparties entre les deux piles de plis.
 */
export function compterDonne(etat: Etat): Decompte {
  const { ramassees } = etat;

  const cartes = compterSi(ramassees, () => true);
  const deniers = compterSi(ramassees, (c) => c.couleur === 'deniers');
  const haya = compterSi(ramassees, (c) => memeCarte(c, HAYA));

  const details: Detail[] = [
    { categorie: 'karta', vainqueur: majorite(cartes[0], cartes[1]), compte: cartes },
    { categorie: 'dineri', vainqueur: majorite(deniers[0], deniers[1]), compte: deniers },
    { categorie: 'haya', vainqueur: majorite(haya[0], haya[1]), compte: haya },
    barmila(ramassees),
  ];

  const points: [number, number] = [etat.chkobbas[0], etat.chkobbas[1]];
  for (const detail of details) {
    if (detail.vainqueur !== null) points[detail.vainqueur] += 1;
  }

  return { details, chkobbas: etat.chkobbas, points };
}

/** Ajoute les points de la donne écoulée aux scores de la partie. */
export function ajouterAuScore(etat: Etat, decompte: Decompte): Etat {
  return {
    ...etat,
    scores: [
      etat.scores[0] + decompte.points[0],
      etat.scores[1] + decompte.points[1],
    ],
  };
}

/**
 * Le vainqueur de la partie, ou null si elle continue.
 *
 * Si les deux joueurs franchissent le seuil dans la même donne, le score le
 * plus élevé l'emporte. À égalité parfaite, on rejoue une donne.
 */
export function vainqueur(etat: Etat): Joueur | null {
  const [a, b] = etat.scores;
  if (a < POINTS_POUR_GAGNER && b < POINTS_POUR_GAGNER) return null;
  return majorite(a, b);
}

const LIBELLES: Record<Categorie, string> = {
  karta: 'Karta  (cartes)',
  dineri: 'Dineri (deniers)',
  haya: 'Haya   (7♦)',
  barmila: 'Barmila (7)',
};

/** Décompte lisible en console. */
export function nomDecompte(decompte: Decompte): string {
  const lignes = decompte.details.map((detail) => {
    const attribution =
      detail.vainqueur === null ? 'personne' : `joueur ${detail.vainqueur + 1}`;
    return `    ${LIBELLES[detail.categorie].padEnd(18)} ${detail.compte[0]} - ${detail.compte[1]}   → ${attribution}`;
  });

  lignes.push(
    `    ${'Chkobbas'.padEnd(18)} ${decompte.chkobbas[0]} - ${decompte.chkobbas[1]}`,
  );
  lignes.push(
    `    ${'TOTAL'.padEnd(18)} ${decompte.points[0]} - ${decompte.points[1]}`,
  );

  return lignes.join('\n');
}
