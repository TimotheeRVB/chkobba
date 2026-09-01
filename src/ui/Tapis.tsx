/**
 * Le tapis.
 *
 * Ce composant est purement visuel : il reçoit une Vue — ce qu'un joueur a le
 * droit de voir — et signale les coups joués. Il ignore complètement si la
 * partie se déroule en local contre l'IA ou à distance contre quelqu'un.
 *
 * C'est ce qui permet aux deux modes de partager le même écran de jeu.
 */

import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { type Carte, type Coup, type Vue, coupsPour, prisesPossibles } from '../jeu';
import { CarteVue, DosDeCarte, nomCarte, type NomTheme } from './Carte';
import { PALETTE } from './theme';

const cle = (c: Carte) => `${c.couleur}-${c.valeur}`;
const memeCarte = (a: Carte, b: Carte) => a.couleur === b.couleur && a.valeur === b.valeur;

type Props = {
  vue: Vue;
  theme: NomTheme;
  onTheme: (t: NomTheme) => void;
  onJouer: (coup: Coup) => void;
  /** Texte affiché sous la main adverse : nom du joueur, état de connexion… */
  legendeAdversaire: string;
  /** Bloque la saisie même si c'est notre tour (attente réseau, fin de donne). */
  gele?: boolean;
  /** Secondes restantes au joueur dont c'est le tour. Absent en solo. */
  secondes?: number | null;
};

export function Tapis({
  vue,
  theme,
  onTheme,
  onJouer,
  legendeAdversaire,
  gele = false,
  secondes = null,
}: Props) {
  const [choisie, setChoisie] = useState<Carte | null>(null);

  const moi = vue.moi;
  const lui = moi === 0 ? 1 : 0;

  const options = useMemo(
    () => (choisie ? prisesPossibles(vue.table, choisie.valeur) : []),
    [choisie, vue.table],
  );

  const visees = useMemo(() => new Set(options.flat().map(cle)), [options]);

  const actif = vue.aMoiDeJouer && !gele;

  const jouer = (coup: Coup) => {
    setChoisie(null);
    onJouer(coup);
  };

  const toucher = (carte: Carte) => {
    const prises = prisesPossibles(vue.table, carte.valeur);
    if (prises.length === 0) return jouer({ carte, prise: [] });
    if (prises.length === 1) return jouer({ carte, prise: prises[0]! });
    setChoisie(choisie && memeCarte(choisie, carte) ? null : carte);
  };

  // Le client calcule lui-même ses coups : il a sa main et la table. Le
  // serveur revalidera de toute façon.
  const coupsDisponibles = coupsPour(vue.table, vue.maMain);

  return (
    <ScrollView style={styles.scene} contentContainerStyle={styles.contenu}>
      <View style={styles.bandeau}>
        <Text style={styles.titre}>Chkobba</Text>

        <View style={styles.selecteur}>
          {(['francais', 'espagnol'] as const).map((id) => (
            <Pressable
              key={id}
              onPress={() => onTheme(id)}
              style={[styles.onglet, theme === id && styles.ongletActif]}
            >
              <Text style={[styles.texteOnglet, theme === id && styles.texteOngletActif]}>
                {id === 'francais' ? 'Français' : 'Espagnol'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.scores}>
          {vue.scores[moi]} – {vue.scores[lui]}
        </Text>
      </View>

      <View style={styles.ligneEtiquette}>
        <Text style={styles.etiquette}>
          {legendeAdversaire} · {vue.chkobbas[lui]} chkobba
        </Text>
        {secondes !== null && !vue.aMoiDeJouer && (
          <Text style={[styles.minuteur, secondes <= 10 && styles.minuteurUrgent]}>
            {secondes} s
          </Text>
        )}
      </View>
      <View style={styles.rangee}>
        {Array.from({ length: vue.cartesAdversaire }).map((_, i) => (
          <DosDeCarte key={i} petite />
        ))}
      </View>

      {vue.dernierCoup && vue.dernierCoup.joueur === lui && (
        <Text style={styles.annonce}>
          a joué {nomCarte(vue.dernierCoup.carte, theme)}
          {vue.dernierCoup.prise.length > 0
            ? ` et pris ${vue.dernierCoup.prise.map((c) => nomCarte(c, theme)).join(' + ')}`
            : ' sans prendre'}
        </Text>
      )}

      <View style={styles.tapis}>
        <Text style={styles.pioche}>
          {vue.pioche} en pioche · {vue.mesRamassees.length} carte
          {vue.mesRamassees.length > 1 ? 's' : ''} gagnée
          {vue.mesRamassees.length > 1 ? 's' : ''}
        </Text>
        <View style={styles.rangeeCentree}>
          {vue.table.length === 0 ? (
            <Text style={styles.vide}>Table vide</Text>
          ) : (
            vue.table.map((c) => (
              <CarteVue
                key={cle(c)}
                carte={c}
                theme={theme}
                apparence={visees.has(cle(c)) ? 'visee' : choisie ? 'estompee' : 'neutre'}
              />
            ))
          )}
        </View>
      </View>

      {choisie && options.length > 1 && (
        <View style={styles.choix}>
          <Text style={styles.choixTitre}>
            Avec le {nomCarte(choisie, theme)}, vous pouvez prendre :
          </Text>
          <View style={styles.rangee}>
            {options.map((prise, i) => (
              <Pressable
                key={i}
                style={styles.option}
                onPress={() => jouer({ carte: choisie, prise })}
              >
                <Text style={styles.texteOption}>
                  {prise.map((c) => nomCarte(c, theme)).join(' + ')}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <View style={styles.ligneEtiquette}>
        <Text style={styles.etiquette}>
          {actif ? 'À vous de jouer' : 'Patientez…'} · {vue.chkobbas[moi]} chkobba
        </Text>
        {secondes !== null && vue.aMoiDeJouer && (
          <Text style={[styles.minuteur, secondes <= 10 && styles.minuteurUrgent]}>
            {secondes} s
          </Text>
        )}
      </View>
      <View style={styles.rangee}>
        {vue.maMain.map((c) => (
          <CarteVue
            key={cle(c)}
            carte={c}
            theme={theme}
            apparence={choisie && memeCarte(choisie, c) ? 'choisie' : 'neutre'}
            onPress={actif && coupsDisponibles.length > 0 ? () => toucher(c) : undefined}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scene: { flex: 1, backgroundColor: PALETTE.tapis },
  contenu: { padding: 16, gap: 10 },

  bandeau: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.bordure,
  },
  titre: { color: PALETTE.ivoire, fontSize: 24, fontWeight: '600' },
  scores: { color: PALETTE.ivoire, fontSize: 20, fontWeight: '600' },

  selecteur: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: PALETTE.bordure,
    borderRadius: 999,
    overflow: 'hidden',
  },
  onglet: { paddingVertical: 5, paddingHorizontal: 12 },
  ongletActif: { backgroundColor: PALETTE.laiton },
  texteOnglet: { color: PALETTE.sable, fontSize: 11 },
  texteOngletActif: { color: PALETTE.nuit, fontWeight: '700' },

  ligneEtiquette: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  minuteur: { color: PALETTE.sable, fontSize: 13, fontVariant: ['tabular-nums'] },
  minuteurUrgent: { color: '#e8a33d', fontWeight: '700' },
  etiquette: {
    color: PALETTE.sable,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  annonce: { color: PALETTE.sable, fontSize: 13, fontStyle: 'italic' },

  rangee: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  rangeeCentree: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    minHeight: 90,
    alignItems: 'center',
  },

  tapis: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: PALETTE.bordure,
    backgroundColor: 'rgba(6,40,36,0.3)',
    gap: 8,
  },
  pioche: { color: PALETTE.sable, fontSize: 11 },
  vide: { color: PALETTE.sable, fontStyle: 'italic' },

  choix: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PALETTE.laiton,
    backgroundColor: 'rgba(200,145,47,0.1)',
    gap: 8,
  },
  choixTitre: { color: PALETTE.ivoire, fontSize: 13 },
  option: {
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: PALETTE.laiton,
    borderRadius: 5,
  },
  texteOption: { color: PALETTE.ivoire, fontSize: 14 },
});
