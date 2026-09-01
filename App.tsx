import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet } from 'react-native';

import Accueil, { ADRESSE_SERVEUR } from './src/ui/Accueil';
import EcranSolo from './src/ui/EcranSolo';
import EcranEnLigne from './src/ui/EcranEnLigne';
import type { NomTheme } from './src/ui/Carte';
import { ecrireDernierePartie, ecrireTheme, lireTheme } from './src/stockage';

type Ecran = { nom: 'accueil' } | { nom: 'solo' } | { nom: 'enligne'; code: string };

export default function App() {
  const [ecran, setEcran] = useState<Ecran>({ nom: 'accueil' });
  const [theme, setTheme] = useState<NomTheme>('francais');

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
      <StatusBar style="light" />

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
  racine: { flex: 1, backgroundColor: '#11554d' },
});
