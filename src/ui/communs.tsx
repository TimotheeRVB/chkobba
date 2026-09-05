/** Petits éléments partagés par les écrans. */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Decompte, Joueur } from '../jeu';
import { PALETTE } from './theme';
import Zellige from './Zellige';

export function Panneau({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.scene}>
      <Zellige />
      <View style={styles.panneau}>{children}</View>
    </View>
  );
}

export function Bouton({
  titre,
  onPress,
  secondaire = false,
}: {
  titre: string;
  onPress: () => void;
  secondaire?: boolean;
}) {
  return (
    <Pressable style={[styles.bouton, secondaire && styles.boutonSecondaire]} onPress={onPress}>
      <Text style={[styles.texteBouton, secondaire && styles.texteSecondaire]}>{titre}</Text>
    </Pressable>
  );
}

export function FeuilleDecompte({
  decompte,
  moi,
  scores,
  onContinuer,
  attente,
}: {
  decompte: Decompte;
  moi: Joueur;
  scores: readonly [number, number];
  onContinuer?: () => void;
  attente?: string;
}) {
  const lui: Joueur = moi === 0 ? 1 : 0;

  return (
    <Panneau>
      <Text style={styles.titre}>Fin de la donne</Text>

      {decompte.details.map((d) => (
        <View key={d.categorie} style={styles.ligne}>
          <Text style={styles.nom}>{d.categorie}</Text>
          <Text style={[styles.chiffre, d.vainqueur === moi && styles.gagne]}>
            {d.compte[moi]}
          </Text>
          <Text style={[styles.chiffre, d.vainqueur === lui && styles.gagne]}>
            {d.compte[lui]}
          </Text>
        </View>
      ))}

      <View style={styles.ligne}>
        <Text style={styles.nom}>Chkobbas</Text>
        <Text style={styles.chiffre}>{decompte.chkobbas[moi]}</Text>
        <Text style={styles.chiffre}>{decompte.chkobbas[lui]}</Text>
      </View>

      <View style={[styles.ligne, styles.total]}>
        <Text style={styles.nom}>Points de la donne</Text>
        <Text style={styles.chiffre}>{decompte.points[moi]}</Text>
        <Text style={styles.chiffre}>{decompte.points[lui]}</Text>
      </View>

      <Text style={styles.scoreCourant}>
        Partie : {scores[moi]} – {scores[lui]}
      </Text>

      {onContinuer ? (
        <Bouton titre="Continuer" onPress={onContinuer} />
      ) : (
        <Text style={styles.attente}>{attente ?? 'En attente…'}</Text>
      )}
    </Panneau>
  );
}

const styles = StyleSheet.create({
  scene: { flex: 1, backgroundColor: PALETTE.nuit, justifyContent: 'center' },
  // Panneau posé sur la salle, cerclé de laiton comme le plateau de jeu.
  panneau: {
    margin: 20,
    padding: 24,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: PALETTE.laitonPale,
    backgroundColor: PALETTE.tapisFonce,
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  titre: { color: PALETTE.ivoire, fontSize: 21, marginBottom: 12 },
  ligne: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  nom: { color: PALETTE.ivoire, flex: 1, fontSize: 14 },
  chiffre: { color: PALETTE.sable, width: 42, textAlign: 'right', fontSize: 15 },
  gagne: { color: PALETTE.laiton, fontWeight: '700' },
  total: { borderTopWidth: 1, borderTopColor: PALETTE.bordure, marginTop: 6, paddingTop: 10 },
  scoreCourant: { color: PALETTE.sable, fontSize: 13, marginTop: 12 },
  attente: { color: PALETTE.sable, fontSize: 13, marginTop: 16, textAlign: 'center', fontStyle: 'italic' },

  bouton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 5,
    backgroundColor: PALETTE.laiton,
    alignItems: 'center',
  },
  boutonSecondaire: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: PALETTE.laitonPale,
  },
  texteBouton: {
    color: PALETTE.nuit,
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  texteSecondaire: { color: PALETTE.ivoire },
});
