/**
 * Affichage d'une carte.
 *
 * Un thème est un composant qui reçoit une carte et la dessine. C'est le seul
 * contrat : ajouter un habillage à base d'images importées par le joueur ne
 * demandera qu'une entrée de plus dans THEMES.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import type { Carte as TypeCarte, Couleur } from '../jeu';
import { dosDe, faceDe, trouverJeu } from './jeux/registre';
import { COULEURS_TEXTE } from './theme';

/** Identifiant d'un habillage du catalogue. */
export type NomTheme = string;

const SYMBOLE: Record<Couleur, string> = {
  deniers: '♦',
  coupes: '♥',
  epees: '♠',
  batons: '♣',
};

const FIGURES: Record<number, string> = { 8: 'D', 9: 'V', 10: 'R' };

/**
 * L'indice d'une carte : A, 2 à 7, puis D, V, R.
 *
 * Sert aussi bien aux coins des cartes qu'aux annonces textuelles, qui
 * doivent nommer la carte quel que soit l'habillage choisi.
 */
export function indexDe(valeur: number): string {
  if (valeur === 1) return 'A';
  return FIGURES[valeur] ?? String(valeur);
}

export function nomCarte(carte: TypeCarte): string {
  return `${indexDe(carte.valeur)}${SYMBOLE[carte.couleur]}`;
}

const TEINTE: Record<Couleur, string> = {
  deniers: '#c1121f',
  coupes: '#c1121f',
  epees: '#1c1c1c',
  batons: '#1c1c1c',
};

/** Position des enseignes au centre des cartes numérales, en proportion. */
const PIPS: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]],
  2: [[0.5, 0.14], [0.5, 0.86]],
  3: [[0.5, 0.14], [0.5, 0.5], [0.5, 0.86]],
  4: [[0.26, 0.14], [0.74, 0.14], [0.26, 0.86], [0.74, 0.86]],
  5: [[0.26, 0.14], [0.74, 0.14], [0.5, 0.5], [0.26, 0.86], [0.74, 0.86]],
  6: [[0.26, 0.14], [0.74, 0.14], [0.26, 0.5], [0.74, 0.5], [0.26, 0.86], [0.74, 0.86]],
  7: [
    [0.26, 0.14], [0.74, 0.14], [0.5, 0.32],
    [0.26, 0.5], [0.74, 0.5], [0.26, 0.86], [0.74, 0.86],
  ],
};

/**
 * Gabarit d'une carte, exporté pour que le tapis calcule ses emplacements et
 * ses trajets d'animation sur les mêmes valeurs. Une seule source.
 */
export const CARTE_LARGEUR = 72;
export const CARTE_HAUTEUR = 104;

export type Apparence = 'neutre' | 'choisie' | 'visee' | 'estompee';

type Props = {
  carte: TypeCarte;
  theme?: NomTheme;
  petite?: boolean;
  apparence?: Apparence;
  onPress?: () => void;
};

export function CarteVue({
  carte,
  theme = 'francais',
  petite = false,
  apparence = 'neutre',
  onPress,
}: Props) {
  const jeu = trouverJeu(theme);
  const Face = faceDe(jeu, carte);
  const teinte = TEINTE[carte.couleur];
  const symbole = SYMBOLE[carte.couleur];
  const figure = FIGURES[carte.valeur] !== undefined;
  const estHaya = carte.couleur === 'deniers' && carte.valeur === 7;

  const dimensions = petite ? styles.petite : styles.normale;

  const decor: ViewStyle[] = [styles.carte, dimensions];
  if (apparence === 'choisie') decor.push(styles.choisie);
  if (apparence === 'visee') decor.push(styles.visee);
  if (apparence === 'estompee') decor.push(styles.estompee);
  if (estHaya) decor.push(styles.haya);

  const coin = (retourne: boolean) => (
    <View
      style={[
        styles.coin,
        retourne ? styles.coinBas : styles.coinHaut,
        retourne && styles.retourne,
      ]}
    >
      <Text style={[styles.index, { color: teinte }, petite && styles.indexPetit]}>
        {indexDe(carte.valeur)}
      </Text>
      <Text style={[styles.symbole, { color: teinte }, petite && styles.symbolePetit]}>
        {symbole}
      </Text>
    </View>
  );

  if (Face) {
    return (
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={[decor, styles.carteImage]}
        accessibilityRole="button"
        accessibilityLabel={`${carte.valeur} de ${COULEURS_TEXTE[carte.couleur]}`}
      >
        <Face
          width={petite ? Math.round(CARTE_LARGEUR * 0.7) : CARTE_LARGEUR}
          height={petite ? Math.round(CARTE_HAUTEUR * 0.7) : CARTE_HAUTEUR}
        />
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={decor}
      accessibilityRole="button"
      accessibilityLabel={`${carte.valeur} de ${COULEURS_TEXTE[carte.couleur]}`}
    >
      {coin(false)}

      <View style={styles.centre}>
        {figure ? (
          <View style={[styles.panneau, { borderColor: teinte }]}>
            <Text style={[styles.figure, { color: teinte }, petite && styles.figurePetite]}>
              {indexDe(carte.valeur)}
            </Text>
          </View>
        ) : (
          PIPS[carte.valeur].map(([x, y], i) => (
            <Text
              key={i}
              style={[
                styles.pip,
                petite && styles.pipPetit,
                {
                  color: teinte,
                  left: `${x * 100}%`,
                  top: `${y * 100}%`,
                  transform: [
                    { translateX: petite ? -5 : -7.5 },
                    { translateY: petite ? -5.5 : -8 },
                    { rotate: y > 0.55 ? '180deg' : '0deg' },
                  ],
                },
              ]}
            >
              {symbole}
            </Text>
          ))
        )}
      </View>

      {coin(true)}
    </Pressable>
  );
}

export function DosDeCarte({
  petite = false,
  theme = 'francais',
}: {
  petite?: boolean;
  theme?: NomTheme;
}) {
  const Dos = dosDe(trouverJeu(theme));

  if (Dos) {
    return (
      <View style={[styles.carte, petite ? styles.petite : styles.normale, styles.carteImage]}>
        <Dos
          width={petite ? Math.round(CARTE_LARGEUR * 0.7) : CARTE_LARGEUR}
          height={petite ? Math.round(CARTE_HAUTEUR * 0.7) : CARTE_HAUTEUR}
        />
      </View>
    );
  }

  return (
    <View style={[styles.carte, petite ? styles.petite : styles.normale, styles.dos]}>
      <View style={styles.dosCadre} />
      <View style={styles.dosLosange} />
      <View style={styles.dosCoeur} />
    </View>
  );
}

const styles = StyleSheet.create({
  carte: {
    borderRadius: 5,
    backgroundColor: '#f7f1e3',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  normale: { width: CARTE_LARGEUR, height: CARTE_HAUTEUR },
  // Une carte fournie en fichier dessine son propre fond : on efface le nôtre.
  carteImage: { backgroundColor: 'transparent', borderWidth: 0, overflow: 'hidden' },
  petite: { width: Math.round(CARTE_LARGEUR * 0.7), height: Math.round(CARTE_HAUTEUR * 0.7) },

  choisie: { transform: [{ translateY: -10 }], borderColor: '#c8912f', borderWidth: 2 },
  visee: { transform: [{ translateY: -6 }], borderColor: '#c8912f', borderWidth: 2 },
  estompee: { opacity: 0.4 },
  haya: { borderColor: '#c8912f' },

  coin: { position: 'absolute', alignItems: 'center' },
  coinHaut: { top: 3, left: 4 },
  coinBas: { bottom: 3, right: 4 },
  retourne: { transform: [{ rotate: '180deg' }] },
  index: { fontSize: 15, fontWeight: '700', lineHeight: 16 },
  indexPetit: { fontSize: 11, lineHeight: 12 },
  symbole: { fontSize: 12, lineHeight: 13 },
  symbolePetit: { fontSize: 8, lineHeight: 9 },

  centre: { position: 'absolute', top: 17, bottom: 17, left: 14, right: 14 },
  pip: { position: 'absolute', fontSize: 15, lineHeight: 16 },
  pipPetit: { fontSize: 9, lineHeight: 10 },

  panneau: { flex: 1, borderWidth: 1, borderRadius: 2, alignItems: 'center', justifyContent: 'center' },
  figure: { fontSize: 30, fontWeight: '600' },
  figurePetite: { fontSize: 18 },

  // Dos de carte : un losange de zellige, écho du fond de la salle.
  dos: {
    backgroundColor: '#123f52',
    borderColor: 'rgba(192,138,46,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dosCadre: {
    position: 'absolute',
    top: 5,
    left: 5,
    right: 5,
    bottom: 5,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(192,138,46,0.3)',
  },
  dosLosange: {
    width: '46%',
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: 'rgba(192,138,46,0.55)',
    transform: [{ rotate: '45deg' }],
  },
  dosCoeur: {
    position: 'absolute',
    width: '16%',
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: 'rgba(242,230,204,0.35)',
    transform: [{ rotate: '45deg' }],
  },
});
