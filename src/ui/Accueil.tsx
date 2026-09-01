/** Menu d'entrée : jouer seul, reprendre une partie, ou en rejoindre une. */

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Bouton, Panneau } from './communs';
import { PALETTE } from './theme';
import { lireDernierePartie, oublierDernierePartie, renouvelerJeton } from '../stockage';

/** Adresse du serveur. Remplacez par votre .workers.dev après déploiement. */
export const ADRESSE_SERVEUR = 'ws://127.0.0.1:8787';

const codeAleatoire = () =>
  Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[
    Math.floor(Math.random() * 32)
  ]).join('');

export default function Accueil({
  onSolo,
  onEnLigne,
}: {
  onSolo: () => void;
  onEnLigne: (code: string) => void;
}) {
  const [code, setCode] = useState('');
  const [precedente, setPrecedente] = useState<string | null>(null);

  useEffect(() => {
    lireDernierePartie().then(setPrecedente);
  }, []);

  return (
    <Panneau>
      <Text style={styles.titre}>Chkobba</Text>
      <Text style={styles.sous}>Partie en 21 points</Text>

      <Bouton titre="Jouer contre l'ordinateur" onPress={onSolo} />

      {precedente && (
        <>
          <View style={styles.separation}>
            <Text style={styles.etiquette}>partie en cours</Text>
          </View>
          <Bouton titre={`Reprendre ${precedente}`} onPress={() => onEnLigne(precedente)} />
          <Text
            style={styles.lien}
            onPress={() => {
              void oublierDernierePartie();
              setPrecedente(null);
            }}
          >
            Abandonner cette partie
          </Text>
        </>
      )}

      <View style={styles.separation}>
        <Text style={styles.etiquette}>nouvelle partie à deux</Text>
      </View>

      <TextInput
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
        placeholder="CODE DE LA PARTIE"
        placeholderTextColor="rgba(240,226,196,0.35)"
        style={styles.champ}
        autoCapitalize="characters"
        autoCorrect={false}
      />

      <Bouton
        titre="Rejoindre"
        onPress={() => code.length >= 3 && onEnLigne(code)}
        secondaire
      />
      <Bouton titre="Créer une partie" onPress={() => onEnLigne(codeAleatoire())} secondaire />

      <Text
        style={styles.lien}
        onPress={() => {
          void renouvelerJeton();
          void oublierDernierePartie();
          setPrecedente(null);
        }}
      >
        Changer d'identité de joueur
      </Text>
    </Panneau>
  );
}

const styles = StyleSheet.create({
  titre: { color: PALETTE.ivoire, fontSize: 32, textAlign: 'center' },
  sous: { color: PALETTE.sable, fontSize: 13, textAlign: 'center', marginBottom: 22 },
  separation: { marginTop: 24, marginBottom: 10, alignItems: 'center' },
  etiquette: {
    color: PALETTE.sable,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  champ: {
    borderWidth: 1,
    borderColor: PALETTE.bordure,
    borderRadius: 5,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: PALETTE.ivoire,
    fontSize: 18,
    letterSpacing: 3,
    textAlign: 'center',
  },
  lien: {
    color: PALETTE.sable,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 14,
    textDecorationLine: 'underline',
  },
});
