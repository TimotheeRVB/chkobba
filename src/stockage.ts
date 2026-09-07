/**
 * Ce que l'application retient d'une session à l'autre.
 *
 * Trois choses seulement, toutes locales à l'appareil :
 *   - le jeton du joueur, qui lui rend son siège dans une partie en cours ;
 *   - l'habillage de cartes choisi ;
 *   - le code de la dernière partie rejointe.
 *
 * Rien de tout cela ne transite par le serveur, à part le jeton au moment de
 * se connecter. L'habillage reste une affaire strictement personnelle.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Repli en mémoire.
 *
 * En navigation privée ou si le stockage est plein, AsyncStorage lève une
 * erreur. Plutôt que de faire échouer l'application, on retombe sur une
 * simple carte en mémoire : tout fonctionne, mais rien ne survit à la
 * fermeture.
 */
const memoire = new Map<string, string>();

async function lire(cle: string): Promise<string | null> {
  try {
    const valeur = await AsyncStorage.getItem(cle);
    return valeur ?? memoire.get(cle) ?? null;
  } catch {
    return memoire.get(cle) ?? null;
  }
}

async function ecrire(cle: string, valeur: string): Promise<void> {
  memoire.set(cle, valeur);
  try {
    await AsyncStorage.setItem(cle, valeur);
  } catch {
    /* on garde au moins la valeur en mémoire */
  }
}

async function effacer(cle: string): Promise<void> {
  memoire.delete(cle);
  try {
    await AsyncStorage.removeItem(cle);
  } catch {
    /* rien à faire */
  }
}

/* --- Jeton du joueur --- */

const CLE_JETON = 'chkobba.jeton';

function genererJeton(): string {
  return Array.from({ length: 4 }, () => Math.random().toString(36).slice(2, 10)).join('');
}

let jetonEnCache: string | null = null;

/**
 * L'identifiant durable du joueur.
 *
 * Le serveur associe un siège à ce jeton. Tant qu'il ne change pas, fermer
 * l'application puis la rouvrir permet de reprendre la partie exactement là
 * où elle en était — même main, même score.
 */
export async function obtenirJeton(): Promise<string> {
  if (jetonEnCache) return jetonEnCache;

  const stocke = await lire(CLE_JETON);
  if (stocke) {
    jetonEnCache = stocke;
    return stocke;
  }

  const neuf = genererJeton();
  await ecrire(CLE_JETON, neuf);
  jetonEnCache = neuf;
  return neuf;
}

/** Repart avec une nouvelle identité. Utile pour tester à deux sur un même appareil. */
export async function renouvelerJeton(): Promise<string> {
  jetonEnCache = null;
  await effacer(CLE_JETON);
  return obtenirJeton();
}

/* --- Préférences --- */

const CLE_THEME = 'chkobba.theme';
const CLE_PARTIE = 'chkobba.derniereePartie';

export async function lireTheme(): Promise<string | null> {
  return lire(CLE_THEME);
}

export async function ecrireTheme(theme: string): Promise<void> {
  await ecrire(CLE_THEME, theme);
}

export async function lireDernierePartie(): Promise<string | null> {
  return lire(CLE_PARTIE);
}

export async function ecrireDernierePartie(code: string): Promise<void> {
  await ecrire(CLE_PARTIE, code);
}

export async function oublierDernierePartie(): Promise<void> {
  await effacer(CLE_PARTIE);
}

/* --- Son --- */

const CLE_SON = 'chkobba.son';

export async function lireSonActif(): Promise<boolean | null> {
  const valeur = await lire(CLE_SON);
  return valeur === null ? null : valeur === 'oui';
}

export async function ecrireSonActif(actif: boolean): Promise<void> {
  await ecrire(CLE_SON, actif ? 'oui' : 'non');
}
