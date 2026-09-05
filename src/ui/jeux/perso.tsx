/**
 * Vos jeux de cartes.
 *
 * Deux jeux sont déclarés ici, en plus de l'habillage dessiné par défaut :
 *
 *   Classique  cartes à jouer habituelles, indices dans les coins
 *   Tunisien   cartes sans les valeurs dans les coins
 *
 * ── Où déposer les fichiers ────────────────────────────────────────────
 *
 *   src/ui/jeux/svg/classique/   deniers-1.svg … batons-10.svg + dos.svg
 *   src/ui/jeux/svg/tunisien/    idem
 *
 *   deniers = carreau      coupes = cœur
 *   epees   = pique        batons = trèfle
 *
 * ── Si un jeu n'est pas encore prêt ────────────────────────────────────
 *
 * Metro échoue sur un fichier manquant. Tant qu'un dossier est incomplet,
 * mettez sa section en commentaire et retirez-le de MES_JEUX en bas.
 *
 * ───────────────────────────────────────────────────────────────────────
 */

import type { JeuImages } from './registre';

/* ── Classique ─────────────────────────────────────────────────────────── */

import Deniers1C from './svg/classique/deniers-1.svg';
import Deniers2C from './svg/classique/deniers-2.svg';
import Deniers3C from './svg/classique/deniers-3.svg';
import Deniers4C from './svg/classique/deniers-4.svg';
import Deniers5C from './svg/classique/deniers-5.svg';
import Deniers6C from './svg/classique/deniers-6.svg';
import Deniers7C from './svg/classique/deniers-7.svg';
import Deniers8C from './svg/classique/deniers-8.svg';
import Deniers9C from './svg/classique/deniers-9.svg';
import Deniers10C from './svg/classique/deniers-10.svg';

import Coupes1C from './svg/classique/coupes-1.svg';
import Coupes2C from './svg/classique/coupes-2.svg';
import Coupes3C from './svg/classique/coupes-3.svg';
import Coupes4C from './svg/classique/coupes-4.svg';
import Coupes5C from './svg/classique/coupes-5.svg';
import Coupes6C from './svg/classique/coupes-6.svg';
import Coupes7C from './svg/classique/coupes-7.svg';
import Coupes8C from './svg/classique/coupes-8.svg';
import Coupes9C from './svg/classique/coupes-9.svg';
import Coupes10C from './svg/classique/coupes-10.svg';

import Epees1C from './svg/classique/epees-1.svg';
import Epees2C from './svg/classique/epees-2.svg';
import Epees3C from './svg/classique/epees-3.svg';
import Epees4C from './svg/classique/epees-4.svg';
import Epees5C from './svg/classique/epees-5.svg';
import Epees6C from './svg/classique/epees-6.svg';
import Epees7C from './svg/classique/epees-7.svg';
import Epees8C from './svg/classique/epees-8.svg';
import Epees9C from './svg/classique/epees-9.svg';
import Epees10C from './svg/classique/epees-10.svg';

import Batons1C from './svg/classique/batons-1.svg';
import Batons2C from './svg/classique/batons-2.svg';
import Batons3C from './svg/classique/batons-3.svg';
import Batons4C from './svg/classique/batons-4.svg';
import Batons5C from './svg/classique/batons-5.svg';
import Batons6C from './svg/classique/batons-6.svg';
import Batons7C from './svg/classique/batons-7.svg';
import Batons8C from './svg/classique/batons-8.svg';
import Batons9C from './svg/classique/batons-9.svg';
import Batons10C from './svg/classique/batons-10.svg';

import DosC from './svg/classique/dos.svg';

const CLASSIQUE: JeuImages = {
  id: 'classique',
  nom: 'Classique',
  type: 'images',
  faces: {
    'deniers-1': Deniers1C,
    'deniers-2': Deniers2C,
    'deniers-3': Deniers3C,
    'deniers-4': Deniers4C,
    'deniers-5': Deniers5C,
    'deniers-6': Deniers6C,
    'deniers-7': Deniers7C,
    'deniers-8': Deniers8C,
    'deniers-9': Deniers9C,
    'deniers-10': Deniers10C,

    'coupes-1': Coupes1C,
    'coupes-2': Coupes2C,
    'coupes-3': Coupes3C,
    'coupes-4': Coupes4C,
    'coupes-5': Coupes5C,
    'coupes-6': Coupes6C,
    'coupes-7': Coupes7C,
    'coupes-8': Coupes8C,
    'coupes-9': Coupes9C,
    'coupes-10': Coupes10C,

    'epees-1': Epees1C,
    'epees-2': Epees2C,
    'epees-3': Epees3C,
    'epees-4': Epees4C,
    'epees-5': Epees5C,
    'epees-6': Epees6C,
    'epees-7': Epees7C,
    'epees-8': Epees8C,
    'epees-9': Epees9C,
    'epees-10': Epees10C,

    'batons-1': Batons1C,
    'batons-2': Batons2C,
    'batons-3': Batons3C,
    'batons-4': Batons4C,
    'batons-5': Batons5C,
    'batons-6': Batons6C,
    'batons-7': Batons7C,
    'batons-8': Batons8C,
    'batons-9': Batons9C,
    'batons-10': Batons10C,
  },
};

/* ── Tunisien ──────────────────────────────────────────────────────────── */

import Deniers1T from './svg/tunisien/deniers-1.svg';
import Deniers2T from './svg/tunisien/deniers-2.svg';
import Deniers3T from './svg/tunisien/deniers-3.svg';
import Deniers4T from './svg/tunisien/deniers-4.svg';
import Deniers5T from './svg/tunisien/deniers-5.svg';
import Deniers6T from './svg/tunisien/deniers-6.svg';
import Deniers7T from './svg/tunisien/deniers-7.svg';
import Deniers8T from './svg/tunisien/deniers-8.svg';
import Deniers9T from './svg/tunisien/deniers-9.svg';
import Deniers10T from './svg/tunisien/deniers-10.svg';

import Coupes1T from './svg/tunisien/coupes-1.svg';
import Coupes2T from './svg/tunisien/coupes-2.svg';
import Coupes3T from './svg/tunisien/coupes-3.svg';
import Coupes4T from './svg/tunisien/coupes-4.svg';
import Coupes5T from './svg/tunisien/coupes-5.svg';
import Coupes6T from './svg/tunisien/coupes-6.svg';
import Coupes7T from './svg/tunisien/coupes-7.svg';
import Coupes8T from './svg/tunisien/coupes-8.svg';
import Coupes9T from './svg/tunisien/coupes-9.svg';
import Coupes10T from './svg/tunisien/coupes-10.svg';

import Epees1T from './svg/tunisien/epees-1.svg';
import Epees2T from './svg/tunisien/epees-2.svg';
import Epees3T from './svg/tunisien/epees-3.svg';
import Epees4T from './svg/tunisien/epees-4.svg';
import Epees5T from './svg/tunisien/epees-5.svg';
import Epees6T from './svg/tunisien/epees-6.svg';
import Epees7T from './svg/tunisien/epees-7.svg';
import Epees8T from './svg/tunisien/epees-8.svg';
import Epees9T from './svg/tunisien/epees-9.svg';
import Epees10T from './svg/tunisien/epees-10.svg';

import Batons1T from './svg/tunisien/batons-1.svg';
import Batons2T from './svg/tunisien/batons-2.svg';
import Batons3T from './svg/tunisien/batons-3.svg';
import Batons4T from './svg/tunisien/batons-4.svg';
import Batons5T from './svg/tunisien/batons-5.svg';
import Batons6T from './svg/tunisien/batons-6.svg';
import Batons7T from './svg/tunisien/batons-7.svg';
import Batons8T from './svg/tunisien/batons-8.svg';
import Batons9T from './svg/tunisien/batons-9.svg';
import Batons10T from './svg/tunisien/batons-10.svg';

import DosT from './svg/tunisien/dos.svg';

const TUNISIEN: JeuImages = {
  id: 'tunisien',
  nom: 'Tunisien',
  type: 'images',
  faces: {
    'deniers-1': Deniers1T,
    'deniers-2': Deniers2T,
    'deniers-3': Deniers3T,
    'deniers-4': Deniers4T,
    'deniers-5': Deniers5T,
    'deniers-6': Deniers6T,
    'deniers-7': Deniers7T,
    'deniers-8': Deniers8T,
    'deniers-9': Deniers9T,
    'deniers-10': Deniers10T,

    'coupes-1': Coupes1T,
    'coupes-2': Coupes2T,
    'coupes-3': Coupes3T,
    'coupes-4': Coupes4T,
    'coupes-5': Coupes5T,
    'coupes-6': Coupes6T,
    'coupes-7': Coupes7T,
    'coupes-8': Coupes8T,
    'coupes-9': Coupes9T,
    'coupes-10': Coupes10T,

    'epees-1': Epees1T,
    'epees-2': Epees2T,
    'epees-3': Epees3T,
    'epees-4': Epees4T,
    'epees-5': Epees5T,
    'epees-6': Epees6T,
    'epees-7': Epees7T,
    'epees-8': Epees8T,
    'epees-9': Epees9T,
    'epees-10': Epees10T,

    'batons-1': Batons1T,
    'batons-2': Batons2T,
    'batons-3': Batons3T,
    'batons-4': Batons4T,
    'batons-5': Batons5T,
    'batons-6': Batons6T,
    'batons-7': Batons7T,
    'batons-8': Batons8T,
    'batons-9': Batons9T,
    'batons-10': Batons10T,
  },
};

/**
 * Les jeux proposés dans le menu, après l'habillage dessiné.
 *
 * Une carte absente de `faces` retombe sur le dessin par défaut : un jeu
 * incomplet reste jouable.
 */
export const MES_JEUX: JeuImages[] = [CLASSIQUE, TUNISIEN];
