/**
 * Cartes, paquet et mélange.
 *
 * Ce module ne connaît rien aux règles de la chkobba. Il fournit seulement
 * la matière première : des cartes, un paquet complet, et de quoi le battre.
 */

export type Couleur = 'deniers' | 'coupes' | 'epees' | 'batons';

export const COULEURS: readonly Couleur[] = ['deniers', 'coupes', 'epees', 'batons'];

export type Carte = {
  readonly couleur: Couleur;
  /** Valeur faciale, de 1 à 10. C'est elle qui sert aux prises. */
  readonly valeur: number;
};

/** Les 40 cartes, dans l'ordre. */
export function paquetComplet(): Carte[] {
  const paquet: Carte[] = [];
  for (const couleur of COULEURS) {
    for (let valeur = 1; valeur <= 10; valeur++) {
      paquet.push({ couleur, valeur });
    }
  }
  return paquet;
}

/**
 * Générateur pseudo-aléatoire déterministe (algorithme mulberry32).
 *
 * Math.random() ne peut pas être contrôlé : deux exécutions donnent deux
 * résultats différents, ce qui rend les tests impossibles à écrire. Ici, une
 * même graine produit toujours exactement la même suite de nombres.
 */
export function creerGenerateur(graine: number): () => number {
  let etat = graine >>> 0;
  return () => {
    etat = (etat + 0x6d2b79f5) >>> 0;
    let t = etat;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Mélange de Fisher-Yates : on parcourt le paquet de la fin vers le début et
 * on échange chaque carte avec une carte tirée au hasard parmi celles qui la
 * précèdent. C'est le seul mélange qui garantit que tous les ordres possibles
 * sont équiprobables.
 *
 * Le paquet reçu n'est jamais modifié : une copie est renvoyée.
 * Sans graine, le mélange est réellement aléatoire.
 */
export function melanger(paquet: readonly Carte[], graine?: number): Carte[] {
  const hasard = graine === undefined ? Math.random : creerGenerateur(graine);
  const copie = [...paquet];

  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(hasard() * (i + 1));
    const temporaire = copie[i]!;
    copie[i] = copie[j]!;
    copie[j] = temporaire;
  }

  return copie;
}

const SYMBOLES: Record<Couleur, string> = {
  deniers: '♦',
  coupes: '♥',
  epees: '♠',
  batons: '♣',
};

/** Représentation courte pour l'affichage console : "7♦", "10♠". */
export function nomCarte(carte: Carte): string {
  return `${carte.valeur}${SYMBOLES[carte.couleur]}`;
}

/** Représentation d'une liste de cartes : "7♦ 3♥ 10♠". */
export function nomCartes(cartes: readonly Carte[]): string {
  return cartes.map(nomCarte).join(' ');
}

/** Le 7 de deniers, la haya. Utile pour le décompte. */
export const HAYA: Carte = { couleur: 'deniers', valeur: 7 };

/**
 * Lit des cartes écrites en notation courte : parserCartes('3♦ 4♠ 10♥').
 * Pratique pour les tests et pour la saisie en console.
 */
export function parserCartes(texte: string): Carte[] {
  if (texte.trim() === '') return [];

  return texte.trim().split(/\s+/).map((mot) => {
    const symbole = mot.slice(-1);
    const couleur = (Object.keys(SYMBOLES) as Couleur[]).find(
      (c) => SYMBOLES[c] === symbole,
    );
    if (!couleur) throw new Error(`Symbole inconnu : ${symbole}`);

    const valeur = Number(mot.slice(0, -1));
    if (!Number.isInteger(valeur) || valeur < 1 || valeur > 10) {
      throw new Error(`Valeur invalide : ${mot}`);
    }

    return { couleur, valeur };
  });
}

/** Deux cartes sont-elles la même ? */
export function memeCarte(a: Carte, b: Carte): boolean {
  return a.couleur === b.couleur && a.valeur === b.valeur;
}
