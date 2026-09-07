/**
 * Les sons du jeu.
 *
 * Déposez vos fichiers dans src/sons/audio/ puis décommentez les lignes
 * correspondantes. Formats sûrs : .mp3 ou .m4a, courts et légers.
 *
 * Un son non déclaré est simplement ignoré : vous pouvez n'en ajouter que
 * deux ou trois pour commencer.
 *
 * ── Où trouver des sons libres ─────────────────────────────────────────
 *   freesound.org  en filtrant sur la licence CC0
 *   kenney.nl      paquets d'effets de jeu, domaine public
 *   mixkit.co      effets gratuits, usage commercial autorisé
 * ───────────────────────────────────────────────────────────────────────
 */

export type NomSon =
  /** Une carte est posée sans rien ramasser. */
  | 'poser'
  /** Une carte en ramasse d'autres. */
  | 'prendre'
  /** Le tapis est balayé. */
  | 'chkobba'
  /** Nouvelle donne distribuée. */
  | 'distribuer'
  /** La feuille de décompte s'affiche. */
  | 'finDonne'
  /** Fin de partie. */
  | 'victoire'
  | 'defaite';

/**
 * Les fichiers effectivement présents.
 *
 * `require` renvoie un identifiant d'asset, que expo-audio sait lire
 * directement.
 */
export const SONS: Partial<Record<NomSon, number>> = {
  poser: require('./audio/poser.mp3'),
  prendre: require('./audio/prendre.mp3'),
  chkobba: require('./audio/chkobba.mp3'),
  distribuer: require('./audio/distribuer.mp3'),
  // finDonne: require('./audio/fin-donne.mp3'),
  // victoire: require('./audio/victoire.mp3'),
  // defaite: require('./audio/defaite.mp3'),
};

/** Volume par son, de 0 à 1. Un balayage doit claquer, une pose non. */
export const VOLUMES: Partial<Record<NomSon, number>> = {
  poser: 0.5,
  prendre: 0.7,
  chkobba: 1,
  distribuer: 0.5,
  finDonne: 0.7,
  victoire: 0.9,
  defaite: 0.7,
};
