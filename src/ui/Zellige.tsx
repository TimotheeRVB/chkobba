/**
 * Le fond de zellige.
 *
 * Un carrelage de losanges, comme sur les murs d'un café. Il est tracé avec
 * de simples vues pivotées à 45 degrés : pas d'image à charger, pas de
 * bibliothèque supplémentaire, et le motif reste net à toutes les densités
 * d'écran.
 *
 * L'opacité est volontairement très basse : on doit le percevoir sans jamais
 * le regarder.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { PALETTE } from './theme';

const TAILLE = 54;
/** De quoi couvrir largement le plus grand téléphone en portrait. */
const MOTIFS = 140;

function Zellige() {
  return (
    <View style={styles.calque} pointerEvents="none">
      {Array.from({ length: MOTIFS }).map((_, i) => (
        <View key={i} style={styles.case}>
          <View style={styles.losange} />
          <View style={styles.coeur} />
        </View>
      ))}
    </View>
  );
}

export default React.memo(Zellige);

const styles = StyleSheet.create({
  calque: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    overflow: 'hidden',
  },
  case: { width: TAILLE, height: TAILLE, alignItems: 'center', justifyContent: 'center' },
  losange: {
    width: TAILLE * 0.62,
    height: TAILLE * 0.62,
    borderWidth: 1,
    borderColor: PALETTE.azur,
    transform: [{ rotate: '45deg' }],
    opacity: 0.5,
  },
  coeur: {
    position: 'absolute',
    width: TAILLE * 0.2,
    height: TAILLE * 0.2,
    borderWidth: 1,
    borderColor: PALETTE.laiton,
    transform: [{ rotate: '45deg' }],
    opacity: 0.16,
  },
});
