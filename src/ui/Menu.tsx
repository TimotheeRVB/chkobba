/**
 * Le menu de partie.
 *
 * Un bouton discret dans un coin, qui ouvre les réglages. Pour l'instant il
 * ne contient que le choix de l'habillage des cartes ; c'est l'endroit où
 * viendront le son, la langue ou l'abandon de partie.
 */

import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { JEUX } from './jeux/registre';
import type { NomTheme } from './Carte';
import { PALETTE } from './theme';
import { basculerSons, sonsActifs } from '../sons';

export function BoutonMenu({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      style={styles.bouton}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Ouvrir le menu"
      hitSlop={10}
    >
      <View style={styles.trait} />
      <View style={styles.trait} />
      <View style={styles.trait} />
    </Pressable>
  );
}

export function Menu({
  visible,
  theme,
  onTheme,
  onFermer,
  onQuitter,
}: {
  visible: boolean;
  theme: NomTheme;
  onTheme: (t: NomTheme) => void;
  onFermer: () => void;
  onQuitter?: () => void;
}) {
  const [son, setSon] = useState(sonsActifs());

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onFermer}>
      <Pressable style={styles.voile} onPress={onFermer}>
        {/* L'appui sur la feuille ne doit pas refermer le menu. */}
        <Pressable style={styles.feuille} onPress={() => {}}>
          <Text style={styles.titre}>Cartes</Text>

          <ScrollView style={styles.liste}>
            {JEUX.map((jeu) => (
              <Pressable
                key={jeu.id}
                style={[styles.ligne, theme === jeu.id && styles.ligneActive]}
                onPress={() => onTheme(jeu.id)}
              >
                <Text style={[styles.nom, theme === jeu.id && styles.nomActif]}>
                  {jeu.nom}
                </Text>
                {theme === jeu.id && <Text style={styles.coche}>✓</Text>}
              </Pressable>
            ))}
          </ScrollView>

          {JEUX.length === 1 && (
            <Text style={styles.aide}>
              Déposez vos fichiers dans src/ui/jeux/ pour en ajouter d'autres.
            </Text>
          )}

          <Text style={[styles.titre, styles.titreSecond]}>Son</Text>
          <Pressable style={styles.ligne} onPress={() => setSon(basculerSons())}>
            <Text style={styles.nom}>Effets sonores</Text>
            <Text style={son ? styles.coche : styles.croix}>{son ? '✓' : '—'}</Text>
          </Pressable>

          {onQuitter && (
            <Pressable style={styles.quitter} onPress={onQuitter}>
              <Text style={styles.texteQuitter}>Quitter la partie</Text>
            </Pressable>
          )}

          <Pressable style={styles.fermer} onPress={onFermer}>
            <Text style={styles.texteFermer}>Fermer</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bouton: {
    position: 'absolute',
    top: 6,
    right: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    zIndex: 10,
  },
  trait: { width: 16, height: 1.5, borderRadius: 1, backgroundColor: PALETTE.sable },

  voile: {
    flex: 1,
    backgroundColor: 'rgba(6,20,32,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  feuille: {
    width: '100%',
    maxWidth: 320,
    padding: 22,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: PALETTE.laitonPale,
    backgroundColor: PALETTE.tapisFonce,
  },
  titreSecond: { marginTop: 14 },
  titre: {
    color: PALETTE.sable,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  liste: { maxHeight: 260 },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  ligneActive: { backgroundColor: 'rgba(192,138,46,0.16)' },
  nom: { color: PALETTE.ivoire, fontSize: 15 },
  nomActif: { color: PALETTE.laiton, fontWeight: '500' },
  coche: { color: PALETTE.laiton, fontSize: 15 },
  croix: { color: PALETTE.sable, fontSize: 15 },
  aide: {
    color: PALETTE.sable,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 10,
    lineHeight: 17,
  },

  quitter: { marginTop: 16, paddingVertical: 12, alignItems: 'center' },
  texteQuitter: { color: '#d98a7a', fontSize: 14 },
  fermer: {
    marginTop: 4,
    paddingVertical: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: PALETTE.laitonPale,
    alignItems: 'center',
  },
  texteFermer: {
    color: PALETTE.ivoire,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
