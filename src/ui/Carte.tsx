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
import { COULEURS_TEXTE } from './theme';

export type NomTheme = 'francais' | 'espagnol';

const SYMBOLE: Record<Couleur, string> = {
  deniers: '♦',
  coupes: '♥',
  epees: '♠',
  batons: '♣',
};

const FIGURES: Record<number, string> = { 8: 'D', 9: 'V', 10: 'R' };
const FIGURES_ES: Record<number, string> = { 8: 'S', 9: 'C', 10: 'R' };

export function indexDe(valeur: number, theme: NomTheme = 'francais'): string {
  if (valeur === 1) return 'A';
  const figures = theme === 'espagnol' ? FIGURES_ES : FIGURES;
  return figures[valeur] ?? String(valeur);
}

export function nomCarte(carte: TypeCarte, theme: NomTheme = 'francais'): string {
  return `${indexDe(carte.valeur, theme)}${SYMBOLE[carte.couleur]}`;
}

const TEINTE: Record<NomTheme, Record<Couleur, string>> = {
  francais: {
    deniers: '#c1121f',
    coupes: '#c1121f',
    epees: '#1c1c1c',
    batons: '#1c1c1c',
  },
  espagnol: {
    deniers: '#b8860b',
    coupes: '#a8322a',
    epees: '#2f5d84',
    batons: '#4a7340',
  },
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
  const teinte = TEINTE[theme][carte.couleur];
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
        {indexDe(carte.valeur, theme)}
      </Text>
      <Text style={[styles.symbole, { color: teinte }, petite && styles.symbolePetit]}>
        {symbole}
      </Text>
    </View>
  );

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
              {indexDe(carte.valeur, theme)}
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
                    { translateX: petite ? -4.5 : -6.5 },
                    { translateY: petite ? -5 : -7 },
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

export function DosDeCarte({ petite = false }: { petite?: boolean }) {
  return <View style={[styles.carte, petite ? styles.petite : styles.normale, styles.dos]} />;
}

const styles = StyleSheet.create({
  carte: {
    borderRadius: 5,
    backgroundColor: '#fdfbf6',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  normale: { width: 62, height: 90 },
  petite: { width: 44, height: 64 },

  choisie: { transform: [{ translateY: -10 }], borderColor: '#c8912f', borderWidth: 2 },
  visee: { transform: [{ translateY: -6 }], borderColor: '#c8912f', borderWidth: 2 },
  estompee: { opacity: 0.4 },
  haya: { borderColor: '#c8912f' },

  coin: { position: 'absolute', alignItems: 'center' },
  coinHaut: { top: 3, left: 4 },
  coinBas: { bottom: 3, right: 4 },
  retourne: { transform: [{ rotate: '180deg' }] },
  index: { fontSize: 13, fontWeight: '700', lineHeight: 14 },
  indexPetit: { fontSize: 11, lineHeight: 12 },
  symbole: { fontSize: 10, lineHeight: 11 },
  symbolePetit: { fontSize: 8, lineHeight: 9 },

  centre: { position: 'absolute', top: 14, bottom: 14, left: 12, right: 12 },
  pip: { position: 'absolute', fontSize: 13, lineHeight: 14 },
  pipPetit: { fontSize: 9, lineHeight: 10 },

  panneau: { flex: 1, borderWidth: 1, borderRadius: 2, alignItems: 'center', justifyContent: 'center' },
  figure: { fontSize: 26, fontWeight: '600' },
  figurePetite: { fontSize: 18 },

  dos: { backgroundColor: '#123f52', borderColor: 'rgba(240,226,196,0.25)' },
});
