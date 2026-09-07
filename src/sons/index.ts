/**
 * La lecture des sons.
 *
 * Un lecteur par son, créé une fois pour toutes au démarrage et conservé
 * pour la durée de vie de l'application. C'est ce que recommande expo-audio
 * pour des effets courts déclenchés en rafale : recréer un lecteur à chaque
 * fois introduirait une latence perceptible.
 *
 * Tout est silencieux tant qu'aucun fichier n'est déclaré dans registre.ts :
 * le jeu fonctionne exactement pareil, sans son.
 */

import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import { SONS, VOLUMES, type NomSon } from './registre';
import { lireSonActif, ecrireSonActif } from '../stockage';

const lecteurs = new Map<NomSon, AudioPlayer>();
let actif = true;
let prepare = false;

/**
 * Prépare les lecteurs. À appeler une fois au démarrage.
 *
 * Le mode audio demande à ne pas couper la musique que le joueur écoute
 * peut-être déjà : nos effets se superposent au lieu de s'imposer.
 */
export async function preparerSons(): Promise<void> {
  if (prepare) return;
  prepare = true;

  actif = (await lireSonActif()) ?? true;

  try {
    // playsInSilentMode: le mode silencieux d'iOS ne doit pas couper le jeu.
    await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false });
  } catch (erreur) {
    console.warn('[sons] mode audio indisponible :', erreur);
  }

  const declares = Object.entries(SONS) as [NomSon, number][];
  if (declares.length === 0) {
    console.warn('[sons] aucun fichier déclaré dans registre.ts — le jeu sera muet.');
    return;
  }

  for (const [nom, source] of declares) {
    try {
      const lecteur = createAudioPlayer(source);
      lecteur.volume = VOLUMES[nom] ?? 0.7;
      lecteurs.set(nom, lecteur);
    } catch (erreur) {
      // Le plus souvent : expo-audio absent de la coque native, donc une
      // recompilation manquante. Sans ce message, le symptôme est un
      // silence inexplicable.
      console.warn(`[sons] lecteur « ${nom} » impossible à créer :`, erreur);
    }
  }

  console.log(`[sons] ${lecteurs.size} / ${declares.length} lecteur(s) prêt(s).`);
}

/**
 * Joue un son, sans attendre.
 *
 * Le retour à zéro est indispensable : un lecteur arrivé à la fin de sa
 * piste ne rejoue rien tant qu'on ne l'a pas rembobiné.
 */
export function jouerSon(nom: NomSon): void {
  if (!actif) return;

  const lecteur = lecteurs.get(nom);
  if (!lecteur) return;

  try {
    lecteur.seekTo(0);
    lecteur.play();
  } catch (erreur) {
    console.warn(`[sons] lecture de « ${nom} » impossible :`, erreur);
  }
}

export function sonsActifs(): boolean {
  return actif;
}

export function basculerSons(): boolean {
  actif = !actif;
  void ecrireSonActif(actif);
  return actif;
}

export type { NomSon };
