/**
 * Partie en ligne.
 *
 * Aucun état de jeu n'est calculé ici. L'écran affiche la vue reçue du
 * serveur et lui transmet les coups. Si le serveur refuse, il renvoie
 * aussitôt la vue véritable : l'affichage se recale tout seul.
 */

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';

import { usePartieEnLigne } from '../reseau/connexion';
import { Tapis } from './Tapis';
import { Bouton, FeuilleDecompte, Panneau } from './communs';
import type { NomTheme } from './Carte';
import { PALETTE } from './theme';

type Props = {
  adresse: string;
  code: string;
  theme: NomTheme;
  onTheme: (t: NomTheme) => void;
  onQuitter: () => void;
};

const MESSAGES: Record<string, string> = {
  connexion: 'Connexion au serveur…',
  attente: "En attente de l'adversaire",
  coupe: 'Connexion perdue, nouvelle tentative…',
  injoignable: 'Serveur injoignable.',
  complet: 'Cette partie a déjà deux joueurs.',
  adversaireParti: "Votre adversaire s'est déconnecté.",
};

const PISTES = [
  '• Le serveur tourne-t-il ? (npx wrangler dev)',
  '• Le port affiché par wrangler est-il bien 8787 ?',
  "• L'adresse commence-t-elle par ws:// en local, wss:// en ligne ?",
  '• Depuis un téléphone : wrangler dev --ip 0.0.0.0 et IP du PC',
];

export default function EcranEnLigne({ adresse, code, theme, onTheme, onQuitter }: Props) {
  const { vue, decompte, gagnant, statut, refus, detail, tentatives, secondes, automatique, abandon, jouer } =
    usePartieEnLigne(adresse, code);

  // Le décompte arrive avec le dernier coup de la donne : on le retient le
  // temps que l'animation de ramassage se termine.
  const [decompteMontre, setDecompteMontre] = useState(false);

  useEffect(() => {
    if (!decompte) return setDecompteMontre(false);
    const minuteur = setTimeout(() => setDecompteMontre(true), 2300);
    return () => clearTimeout(minuteur);
  }, [decompte]);

  if (statut === 'complet') {
    return (
      <Panneau>
        <Text style={styles.titre}>Partie complète</Text>
        <Text style={styles.texte}>{MESSAGES.complet}</Text>
        <Bouton titre="Retour" onPress={onQuitter} />
      </Panneau>
    );
  }

  if (!vue) {
    return (
      <Panneau>
        <Text style={styles.titre}>Partie {code}</Text>
        <Text style={styles.texte}>{MESSAGES[statut] ?? 'Chargement…'}</Text>
        {statut !== 'injoignable' && (
          <ActivityIndicator color={PALETTE.laiton} style={styles.attente} />
        )}

        {statut === 'injoignable' ? (
          <>
            <Text style={styles.technique}>{detail}</Text>
            <Text style={styles.technique}>
              {tentatives} tentative{tentatives > 1 ? 's' : ''}
            </Text>
            {PISTES.map((piste) => (
              <Text key={piste} style={styles.piste}>
                {piste}
              </Text>
            ))}
          </>
        ) : (
          <Text style={styles.aide}>
            Donnez le code {code} à votre adversaire pour qu'il vous rejoigne.
          </Text>
        )}

        <Bouton titre="Annuler" onPress={onQuitter} secondaire />
      </Panneau>
    );
  }

  if (abandon !== null) {
    return (
      <Panneau>
        <Text style={styles.titre}>
          {abandon === vue.moi ? 'Vous avez abandonné' : 'Votre adversaire a abandonné'}
        </Text>
        <Text style={styles.texte}>
          {abandon === vue.moi
            ? "Trois coups ont été joués à votre place."
            : 'Il ne jouait plus. La partie est arrêtée.'}
        </Text>
        <Text style={styles.score}>
          {vue.scores[vue.moi]} – {vue.scores[vue.moi === 0 ? 1 : 0]}
        </Text>
        <Bouton titre="Menu" onPress={onQuitter} />
      </Panneau>
    );
  }

  if (gagnant !== null) {
    return (
      <Panneau>
        <Text style={styles.titre}>
          {gagnant === vue.moi ? 'Vous gagnez' : 'Votre adversaire gagne'}
        </Text>
        <Text style={styles.score}>
          {vue.scores[vue.moi]} – {vue.scores[vue.moi === 0 ? 1 : 0]}
        </Text>
        <Bouton titre="Menu" onPress={onQuitter} />
      </Panneau>
    );
  }

  // Le décompte reste affiché tant que le serveur n'a pas envoyé la donne
  // suivante : les deux joueurs le voient en même temps.
  if (decompte && decompteMontre) {
    return (
      <FeuilleDecompte
        decompte={decompte}
        moi={vue.moi}
        scores={vue.scores}
        attente="Donne suivante en cours…"
      />
    );
  }

  return (
    <>
      <Tapis
        vue={vue}
        theme={theme}
        onTheme={onTheme}
        onJouer={jouer}
        legendeAdversaire={statut === 'adversaireParti' ? 'Déconnecté' : 'Adversaire'}
        nomJoueur="Vous"
        gele={statut !== 'jeu'}
        secondes={secondes}
      />
      {automatique && (
        <Text style={styles.automatique}>
          Temps écoulé : un coup a été joué automatiquement.
        </Text>
      )}
      {refus && <Text style={styles.refus}>{refus}</Text>}
    </>
  );
}

const styles = StyleSheet.create({
  titre: { color: PALETTE.ivoire, fontSize: 21, marginBottom: 8 },
  texte: { color: PALETTE.sable, fontSize: 14 },
  aide: { color: PALETTE.sable, fontSize: 12, marginTop: 12, fontStyle: 'italic' },
  attente: { marginVertical: 18 },
  technique: {
    color: PALETTE.laiton,
    fontSize: 12,
    marginTop: 8,
    fontFamily: 'monospace',
  },
  piste: { color: PALETTE.sable, fontSize: 12, marginTop: 5 },
  score: { color: PALETTE.laiton, fontSize: 36, textAlign: 'center', marginVertical: 10 },
  automatique: {
    backgroundColor: '#8a6a1e',
    color: '#fff',
    padding: 9,
    textAlign: 'center',
    fontSize: 13,
  },
  refus: {
    backgroundColor: '#7a2820',
    color: '#fff',
    padding: 10,
    textAlign: 'center',
    fontSize: 13,
  },
});
