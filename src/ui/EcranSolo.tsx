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
  balayageFinal,
  type CoupAnnonce,
} from '../jeu';

import { Tapis } from './Tapis';
import { jouerSon } from '../sons';
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
  const [dernier, setDernier] = useState<CoupAnnonce | null>(null);

  const vue = useMemo(() => vuePour(etat, VOUS, dernier ?? undefined), [etat, dernier]);

  /** Joue un coup et note ce qu'il faut annoncer à l'affichage. */
  const avancer = (coup: Coup, joueur: 0 | 1) => {
    const suivant = appliquerCoup(etat, coup);
    const balayage = balayageFinal(etat, coup, suivant);
    setDernier({
      joueur,
      carte: coup.carte,
      prise: coup.prise,
      ...(balayage ? { balayage } : {}),
    });
    setEtat(suivant);
  };

  useEffect(() => {
    if (decompte || etat.joueurCourant !== ORDI || donneTerminee(etat)) return;
    const minuteur = setTimeout(() => {
      avancer(choisirCoup(etat), ORDI);
      // Laisse la séquence d'animation du coup précédent se terminer.
    }, 900);
    return () => clearTimeout(minuteur);
  }, [etat, decompte]);

  useEffect(() => {
    if (donneTerminee(etat) && !decompte) {
      // Assez long pour laisser le ramassage de la dernière carte s'achever.
      const minuteur = setTimeout(() => {
        jouerSon('finDonne');
        setDecompte(compterDonne(etat));
      }, 2300);
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

  useEffect(() => {
    if (gagnant !== null) jouerSon(gagnant === VOUS ? 'victoire' : 'defaite');
  }, [gagnant]);

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
      onJouer={(coup) => avancer(coup, VOUS)}
      legendeAdversaire="Ordinateur"
      nomJoueur="Vous"
      onQuitter={onQuitter}
    />
  );
}

const styles = StyleSheet.create({
  titre: { color: PALETTE.ivoire, fontSize: 21 },
  score: { color: PALETTE.laiton, fontSize: 36, textAlign: 'center', marginVertical: 10 },
});
