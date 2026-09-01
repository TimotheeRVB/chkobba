/**
 * L'arbitre.
 *
 * C'est la partie serveur, sans une ligne de réseau. Elle reçoit un coup
 * prétendu, le refuse s'il est irrégulier, l'applique sinon, et enchaîne
 * automatiquement le décompte et la donne suivante.
 *
 * Le transport — WebSocket, Supabase, autre — n'aura qu'à appeler
 * `recevoirCoup` et à diffuser les vues renvoyées. Toute la responsabilité
 * du jeu est ici, donc testable sans serveur.
 */

import {
  type Etat,
  type Joueur,
  nouvellePartie,
  donneSuivante,
  donneTerminee,
  verifierIntegrite,
} from './etat';
import { type Coup, coupsPour } from './regles';
import { appliquerCoup, estCoupLegal } from './partie';
import { type Decompte, compterDonne, ajouterAuScore, vainqueur } from './decompte';
import { type CoupAnnonce, type Vue, balayageFinal, vuePour } from './vue';

export type Partie = {
  readonly etat: Etat;
  /** Décompte de la donne qui vient de s'achever, le cas échéant. */
  readonly decompte: Decompte | null;
  readonly gagnant: Joueur | null;
};

export type Refus = {
  readonly ok: false;
  readonly raison:
    | "ce n'est pas votre tour"
    | 'coup interdit'
    | 'la partie est terminée';
};

export type Acceptation = {
  readonly ok: true;
  readonly partie: Partie;
  /** Une vue par joueur, prête à être envoyée. */
  readonly vues: readonly [Vue, Vue];
};

export type Reponse = Acceptation | Refus;

/** Démarre une partie. Le mélange n'a lieu que côté serveur. */
export function ouvrirPartie(graine?: number): Partie {
  return { etat: nouvellePartie(graine), decompte: null, gagnant: null };
}

/** Les deux vues correspondant à un état, avec le dernier coup joué. */
function vues(etat: Etat, dernier?: CoupAnnonce): [Vue, Vue] {
  return [vuePour(etat, 0, dernier), vuePour(etat, 1, dernier)];
}

/** Ce que voit chaque joueur, sans coup précédent à signaler. */
export function vuesDe(partie: Partie): [Vue, Vue] {
  return vues(partie.etat);
}

/**
 * Traite le coup annoncé par un joueur.
 *
 * Rien n'est pris pour argent comptant : on vérifie que c'est bien son tour,
 * puis que le coup figure parmi ceux que l'état réel autorise. Un client
 * modifié ne peut donc pas jouer une carte qu'il n'a pas, ni ramasser des
 * cartes auxquelles il n'a pas droit.
 */
export function recevoirCoup(
  partie: Partie,
  joueur: Joueur,
  coup: Coup,
): Reponse {
  if (partie.gagnant !== null) {
    return { ok: false, raison: 'la partie est terminée' };
  }

  if (partie.etat.joueurCourant !== joueur) {
    return { ok: false, raison: "ce n'est pas votre tour" };
  }

  if (!estCoupLegal(partie.etat, coup)) {
    return { ok: false, raison: 'coup interdit' };
  }

  let etat = appliquerCoup(partie.etat, coup);
  verifierIntegrite(etat);

  const balayage = balayageFinal(partie.etat, coup, etat);
  const dernier: CoupAnnonce = {
    joueur,
    carte: coup.carte,
    prise: coup.prise,
    ...(balayage ? { balayage } : {}),
  };

  if (!donneTerminee(etat)) {
    return {
      ok: true,
      partie: { etat, decompte: null, gagnant: null },
      vues: vues(etat, dernier),
    };
  }

  // Fin de donne : on compte, on ajoute au score, on enchaîne si besoin.
  const decompte = compterDonne(etat);
  etat = ajouterAuScore(etat, decompte);
  const gagnant = vainqueur(etat);

  if (gagnant === null) etat = donneSuivante(etat);

  return {
    ok: true,
    partie: { etat, decompte, gagnant },
    vues: vues(etat, dernier),
  };
}

/**
 * Coup de secours quand un joueur ne répond pas : on joue pour lui le
 * premier coup autorisé. À brancher sur un minuteur côté serveur.
 */
export function coupParDefaut(partie: Partie): Coup {
  const etat = partie.etat;
  return coupsPour(etat.table, etat.mains[etat.joueurCourant])[0]!;
}
