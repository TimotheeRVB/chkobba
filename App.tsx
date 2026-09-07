import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  AppState,
  SafeAreaView,
  StatusBar as BarreSysteme,
  StyleSheet,
} from 'react-native';

import Accueil, { ADRESSE_SERVEUR } from './src/ui/Accueil';
import EcranSolo from './src/ui/EcranSolo';
import EcranEnLigne from './src/ui/EcranEnLigne';
import type { NomTheme } from './src/ui/Carte';
import { ecrireDernierePartie, ecrireTheme, lireTheme } from './src/stockage';
import { preparerSons } from './src/sons';

type Ecran = { nom: 'accueil' } | { nom: 'solo' } | { nom: 'enligne'; code: string };

export default function App() {
  const [ecran, setEcran] = useState<Ecran>({ nom: 'accueil' });
  const [theme, setTheme] = useState<NomTheme>('francais');

  /**
   * Maintien du plein écran.
   *
   * Masquer la barre d'état est un ordre ponctuel, pas un état permanent :
   * tout ce qui la fait réapparaître — le menu de développement, un appel,
   * un retour depuis une autre application — la laisse visible. On la remasque
   * donc à chaque retour au premier plan.
   */
  useEffect(() => {
    const masquer = () => BarreSysteme.setHidden(true, 'fade');
    masquer();

    const abonnement = AppState.addEventListener('change', (etat) => {
      if (etat === 'active') masquer();
    });

    return () => abonnement.remove();
  }, []);

  // Les lecteurs sont créés une fois, au lancement.
  useEffect(() => {
    void preparerSons();
  }, []);

  // L'habillage choisi est retenu d'une session à l'autre.
  useEffect(() => {
    lireTheme().then((valeur) => {
      if (valeur === 'francais' || valeur === 'espagnol') setTheme(valeur);
    });
  }, []);

  const changerTheme = (nouveau: NomTheme) => {
    setTheme(nouveau);
    void ecrireTheme(nouveau);
  };

  const rejoindre = (code: string) => {
    void ecrireDernierePartie(code);
    setEcran({ nom: 'enligne', code });
  };

  const retour = () => setEcran({ nom: 'accueil' });

  return (
    <SafeAreaView style={styles.racine}>
      {/* Plein écran : la barre d'état laisse la place au jeu. */}
      <StatusBar hidden />

      {ecran.nom === 'accueil' && <Accueil onSolo={() => setEcran({ nom: 'solo' })} onEnLigne={rejoindre} />}

      {ecran.nom === 'solo' && (
        <EcranSolo theme={theme} onTheme={changerTheme} onQuitter={retour} />
      )}

      {ecran.nom === 'enligne' && (
        <EcranEnLigne
          adresse={ADRESSE_SERVEUR}
          code={ecran.code}
          theme={theme}
          onTheme={changerTheme}
          onQuitter={retour}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  racine: { flex: 1, backgroundColor: '#0a2233' },
});
