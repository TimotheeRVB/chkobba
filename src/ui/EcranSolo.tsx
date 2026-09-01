/**
 * Partie contre l'IA, entièrement locale.
 *
 * L'état complet vit ici, mais l'affichage passe par vuePour : le Tapis reçoit
 * exactement la même structure qu'en ligne. Un seul écran de jeu à maintenir.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  type Coup,
  type Decompte,
  type Etat,
  ajouterAuScore,
  appliquerCoup,
  choisirCoup,
  compterDonne,
  donneSuivante,
  donneTerminee,
  nouvellePartie,
  vainqueur,
  vuePour,
} from '../jeu';

import { Tapis } from './Tapis';
import { Bouton, FeuilleDecompte, Panneau } from './communs';
import type { NomTheme } from './Carte';
import { Text, StyleSheet } from 'react-native';
import { PALETTE } from './theme';

const VOUS = 0;
const ORDI = 1;

export default function EcranSolo({
  theme,
  onTheme,
  onQuitter,
}: {
  theme: NomTheme;
  onTheme: (t: NomTheme) => void;
  onQuitter: () => void;
}) {
  const [etat, setEtat] = useState<Etat>(() => nouvellePartie());
  const [decompte, setDecompte] = useState<Decompte | null>(null);
  const [dernier, setDernier] = useState<Coup & { joueur: 0 | 1 } | null>(null);

  const vue = useMemo(
    () =>
      vuePour(
        etat,
        VOUS,
        dernier ? { joueur: dernier.joueur, carte: dernier.carte, prise: dernier.prise } : undefined,
      ),
    [etat, dernier],
  );

  useEffect(() => {
    if (decompte || etat.joueurCourant !== ORDI || donneTerminee(etat)) return;
    const minuteur = setTimeout(() => {
      const coup = choisirCoup(etat);
      setDernier({ ...coup, joueur: ORDI });
      setEtat(appliquerCoup(etat, coup));
    }, 800);
    return () => clearTimeout(minuteur);
  }, [etat, decompte]);

  useEffect(() => {
    if (donneTerminee(etat) && !decompte) {
      const minuteur = setTimeout(() => setDecompte(compterDonne(etat)), 500);
      return () => clearTimeout(minuteur);
    }
  }, [etat, decompte]);

  const continuer = () => {
    if (!decompte) return;
    const avecPoints = ajouterAuScore(etat, decompte);
    setDecompte(null);
    setDernier(null);
    setEtat(vainqueur(avecPoints) !== null ? avecPoints : donneSuivante(avecPoints));
  };

  const gagnant = vainqueur(etat);

  if (decompte) {
    return (
      <FeuilleDecompte
        decompte={decompte}
        moi={VOUS}
        scores={etat.scores}
        onContinuer={continuer}
      />
    );
  }

  if (gagnant !== null) {
    return (
      <Panneau>
        <Text style={styles.titre}>
          {gagnant === VOUS ? 'Vous gagnez' : "L'ordinateur gagne"}
        </Text>
        <Text style={styles.score}>
          {etat.scores[VOUS]} – {etat.scores[ORDI]}
        </Text>
        <Bouton titre="Rejouer" onPress={() => { setDernier(null); setEtat(nouvellePartie()); }} />
        <Bouton titre="Menu" onPress={onQuitter} secondaire />
      </Panneau>
    );
  }

  return (
    <Tapis
      vue={vue}
      theme={theme}
      onTheme={onTheme}
      onJouer={(coup) => {
        setDernier({ ...coup, joueur: VOUS });
        setEtat(appliquerCoup(etat, coup));
      }}
      legendeAdversaire="Ordinateur"
    />
  );
}

const styles = StyleSheet.create({
  titre: { color: PALETTE.ivoire, fontSize: 21 },
  score: { color: PALETTE.laiton, fontSize: 36, textAlign: 'center', marginVertical: 10 },
});
