/**
 * Le tapis.
 *
 * Ce composant est purement visuel : il reçoit une Vue — ce qu'un joueur a le
 * droit de voir — et signale les coups joués. Il ignore complètement si la
 * partie se déroule en local contre l'IA ou à distance contre quelqu'un.
 *
 * C'est ce qui permet aux deux modes de partager le même écran de jeu.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { type Carte, type Coup, type Vue, coupsPour, prisesPossibles } from '../jeu';
import { CarteVue, DosDeCarte, nomCarte, type NomTheme } from './Carte';
import { PALETTE } from './theme';

const cle = (c: Carte) => `${c.couleur}-${c.valeur}`;
const memeCarte = (a: Carte, b: Carte) => a.couleur === b.couleur && a.valeur === b.valeur;

/** Une main ne dépasse jamais trois cartes. */
const EMPLACEMENTS_MAIN = 3;

/**
 * Emplacements réservés sur le tapis.
 *
 * Mesure sur 108 000 positions : une rangée de cinq suffit dans 95 % des cas,
 * huit couvrent 99,8 %, et le maximum observé est de dix. Au-delà, la rangée
 * s'agrandit — c'est assez rare pour être acceptable.
 */
const EMPLACEMENTS_TABLE = 8;

/** Durées, en millisecondes. Réglables sans rien casser. */
const REVELATION_MS = 320;
const PAUSE_MS = 340;
const RAMASSAGE_MS = 420;
const BALAYAGE_MS = 460;

type Sequence = {
  joueur: 0 | 1;
  carte: Carte;
  prise: readonly Carte[];
  balayage?: { joueur: 0 | 1; cartes: readonly Carte[] };
  phase: 'revelation' | 'ramassage' | 'balayage';
};

/**
 * Attribue à chaque carte un emplacement fixe, qu'elle conserve tant qu'elle
 * est là.
 *
 * Sans ça, retirer une carte décale toutes les suivantes : la rangée se
 * recentre et le joueur voit tout bouger sous son doigt. Ici l'emplacement
 * libéré reste vide, et une nouvelle carte vient occuper le premier trou.
 */
function repartir(
  precedent: readonly (Carte | null)[],
  cartes: readonly Carte[],
  nombre: number,
): (Carte | null)[] {
  const suivant = [...precedent];

  // Libérer les emplacements dont la carte a été jouée ou ramassée.
  for (let i = 0; i < suivant.length; i++) {
    const occupant = suivant[i];
    if (occupant && !cartes.some((c) => memeCarte(c, occupant))) suivant[i] = null;
  }

  // Installer les nouvelles venues dans les premiers trous disponibles.
  for (const carte of cartes) {
    if (suivant.some((e) => e && memeCarte(e, carte))) continue;
    const libre = suivant.indexOf(null);
    if (libre === -1) suivant.push(carte);
    else suivant[libre] = carte;
  }

  // Résorber les emplacements surnuméraires devenus vides.
  while (suivant.length > nombre && suivant[suivant.length - 1] === null) suivant.pop();

  return suivant;
}

function useEmplacements(
  cartes: readonly Carte[],
  nombre: number,
): (Carte | null)[] {
  const memoire = useRef<(Carte | null)[]>(Array(nombre).fill(null));
  const resultat = repartir(memoire.current, cartes, nombre);

  /**
   * La mémoire n'est validée qu'après un rendu réellement affiché.
   *
   * C'est essentiel : useSequence ajuste son état pendant le rendu, ce qui
   * pousse React à relancer le composant et à jeter le premier passage. Si on
   * écrivait la mémoire pendant ce passage, on figerait une répartition
   * calculée sur une séquence périmée — et une carte se retrouverait au
   * premier emplacement libre au lieu du sien.
   */
  useEffect(() => {
    memoire.current = resultat;
  });

  return resultat;
}

/**
 * Met en scène le dernier coup reçu.
 *
 * Deux temps. D'abord la carte jouée s'affiche au centre du tapis : c'est le
 * moment où l'adversaire découvre ce qui a été posé. Puis, s'il y a prise,
 * les cartes ramassées glissent vers le camp de celui qui les emporte.
 *
 * Pendant toute la séquence, les cartes prises restent affichées à leur
 * emplacement — sans quoi elles disparaîtraient avant d'être vues.
 */
function useSequence(
  dernierCoup: Vue['dernierCoup'],
  moi: 0 | 1,
): {
  sequence: Sequence | null;
  apparition: Animated.Value;
  ramassage: Animated.Value;
  balayage: Animated.Value;
} {
  const [sequence, setSequence] = useState<Sequence | null>(null);
  const apparition = useRef(new Animated.Value(0)).current;
  const ramassage = useRef(new Animated.Value(0)).current;
  const balayage = useRef(new Animated.Value(0)).current;
  const traitee = useRef<string | null>(null);

  // Une signature textuelle : l'objet change d'identité à chaque message,
  // mais son contenu ne change qu'à chaque vrai coup.
  const signature = dernierCoup
    ? `${dernierCoup.joueur}-${cle(dernierCoup.carte)}-${dernierCoup.prise
        .map(cle)
        .join(',')}`
    : null;

  /**
   * La séquence est armée pendant le rendu, et non dans un effet.
   *
   * Un effet s'exécute après que React a peint : il y aurait donc une image
   * montrant déjà la nouvelle table avant le début de l'animation. C'est le
   * scintillement classique. En ajustant l'état ici, la toute première image
   * affichée est déjà la bonne.
   */
  if (signature !== traitee.current) {
    traitee.current = signature;
    apparition.setValue(0);
    ramassage.setValue(0);
    // Inutile de révéler au joueur une carte qu'il vient de choisir : on
    // passe directement au ramassage pour son propre coup.
    setSequence(
      dernierCoup
        ? {
            ...dernierCoup,
            phase: dernierCoup.joueur === moi ? 'ramassage' : 'revelation',
          }
        : null,
    );
  }

  useEffect(() => {
    if (!dernierCoup || !signature) return;

    const { prise, joueur } = dernierCoup;

    // Fin de donne : le dernier ramasseur emporte ce qui reste sur le tapis.
    const balayer = () => {
      if (!dernierCoup.balayage) return setSequence(null);
      setSequence((s) => (s ? { ...s, phase: 'balayage' } : null));
      Animated.timing(balayage, {
        toValue: 1,
        duration: BALAYAGE_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setSequence(null);
      });
    };

    const emporter = () => {
      if (prise.length === 0) return balayer();
      setSequence((s) => (s ? { ...s, phase: 'ramassage' } : null));
      Animated.timing(ramassage, {
        toValue: 1,
        duration: RAMASSAGE_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) balayer();
      });
    };

    // Son propre coup : pas de révélation, on enchaîne.
    if (joueur === moi) {
      emporter();
      return;
    }

    const revelation = Animated.sequence([
      Animated.timing(apparition, {
        toValue: 1,
        duration: REVELATION_MS,
        useNativeDriver: true,
      }),
      Animated.delay(PAUSE_MS),
    ]);

    revelation.start(({ finished }) => {
      if (finished) emporter();
    });

    return () => revelation.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return { sequence, apparition, ramassage, balayage };
}

type Props = {
  vue: Vue;
  theme: NomTheme;
  onTheme: (t: NomTheme) => void;
  onJouer: (coup: Coup) => void;
  /** Nom affiché sous l'avatar adverse. */
  legendeAdversaire: string;
  /** Nom affiché sous votre avatar. */
  nomJoueur?: string;
  /** Photos de profil. Absentes pour l'instant : l'emplacement est réservé. */
  avatarJoueur?: string;
  avatarAdversaire?: string;
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
  nomJoueur = 'Vous',
  avatarJoueur,
  avatarAdversaire,
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

  const { sequence, apparition, ramassage, balayage } = useSequence(vue.dernierCoup, moi);

  /**
   * Les cartes montrées sur le tapis.
   *
   * Pendant la séquence on réinjecte les cartes prises : elles ont déjà
   * disparu de la vue reçue, mais le joueur doit les voir partir. Et la carte
   * tout juste jouée est retirée du tapis tant qu'elle est affichée au
   * centre, pour ne pas apparaître deux fois.
   */
  const cartesAffichees = useMemo(() => {
    if (!sequence) return vue.table;

    // La carte jouée reste dans la liste même pendant qu'elle se retourne
    // ailleurs : sans ça, son emplacement ne serait pas réservé et elle
    // viendrait se poser sur le premier trou venu à la fin de la révélation.
    return [
      ...vue.table,
      ...sequence.prise,
      ...(sequence.balayage?.cartes ?? []),
    ];
  }, [vue.table, sequence]);

  /**
   * Les mains, gelées pendant l'animation.
   *
   * Le moteur redistribue dès que les deux mains sont vides, à l'intérieur
   * même d'appliquerCoup. Sans précaution, les trois cartes suivantes
   * surgiraient pendant que les précédentes sont encore en train d'être
   * ramassées. On retient donc l'état d'avant le coup jusqu'à la fin de la
   * séquence : les cartes fraîchement distribuées sont simplement écartées de
   * l'affichage, le moteur, lui, a déjà avancé.
   */
  const mainAvant = useRef<readonly Carte[]>(vue.maMain);
  const adversaireAvant = useRef<number>(vue.cartesAdversaire);

  const mainAffichee = sequence
    ? vue.maMain.filter((c) => mainAvant.current.some((d) => memeCarte(c, d)))
    : vue.maMain;

  /**
   * Le compteur de cartes adverses pendant l'animation.
   *
   * La carte que l'adversaire vient de jouer a quitté sa main : il faut la
   * retrancher, sinon on verrait son dos en même temps qu'elle se retourne au
   * centre. Le minimum, lui, écarte les cartes d'une éventuelle
   * redistribution, qui ne doit apparaître qu'après la séquence.
   */
  const cartesAdversaire = sequence
    ? Math.max(
        0,
        Math.min(
          vue.cartesAdversaire,
          adversaireAvant.current - (sequence.joueur === lui ? 1 : 0),
        ),
      )
    : vue.cartesAdversaire;

  useEffect(() => {
    if (sequence) return;
    mainAvant.current = vue.maMain;
    adversaireAvant.current = vue.cartesAdversaire;
  }, [sequence, vue.maMain, vue.cartesAdversaire]);

  const emplacementsTable = useEmplacements(cartesAffichees, EMPLACEMENTS_TABLE);
  const emplacementsMain = useEmplacements(mainAffichee, EMPLACEMENTS_MAIN);

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

      <View style={styles.zoneJeu}>
      <BlocJoueur
        nom={legendeAdversaire}
        avatar={avatarAdversaire}
        chkobbas={vue.chkobbas[lui]}
        actif={!vue.aMoiDeJouer}
        secondes={secondes}
      />
      {/* Les dos occupent des emplacements fixes. On ne connaît pas la carte
          jouée par l'adversaire, donc c'est le dernier emplacement qui se
          libère — les autres ne bougent pas d'un pixel. */}
      <View style={[styles.rangee, styles.rangeeMain]}>
        {Array.from({ length: EMPLACEMENTS_MAIN }).map((_, i) =>
          i < cartesAdversaire ? (
            <DosDeCarte key={`dos-${i}`} />
          ) : (
            <View key={`vide-${i}`} style={styles.emplacement} />
          ),
        )}
      </View>

      <Text style={styles.annonce} numberOfLines={1}>
        {vue.dernierCoup && vue.dernierCoup.joueur === lui
          ? `a joué ${nomCarte(vue.dernierCoup.carte, theme)}` +
            (vue.dernierCoup.prise.length > 0
              ? ` et pris ${vue.dernierCoup.prise.map((c) => nomCarte(c, theme)).join(' + ')}`
              : ' sans prendre')
          : ' '}
      </Text>

      <View style={styles.tapis}>
        <Text style={styles.pioche}>
          {vue.pioche} en pioche · {vue.mesRamassees.length} carte
          {vue.mesRamassees.length > 1 ? 's' : ''} gagnée
          {vue.mesRamassees.length > 1 ? 's' : ''}
        </Text>
        <View style={styles.rangeeCentree}>
          {emplacementsTable.map((c, i) => {
            if (!c) return <View key={`vide-${i}`} style={styles.emplacement} />;

            // Pendant qu'elle se retourne au centre, la carte jouée laisse
            // son emplacement visible mais vide. Elle s'y posera à la fin.
            if (sequence?.phase === 'revelation' && memeCarte(c, sequence.carte)) {
              return <View key={cle(c)} style={styles.emplacement} />;
            }

            const carte = (
              <CarteVue
                carte={c}
                theme={theme}
                apparence={visees.has(cle(c)) ? 'visee' : choisie ? 'estompee' : 'neutre'}
              />
            );

            // Deux départs possibles : la prise du coup, puis le balayage
            // final. Chacun file vers le camp de celui qui l'emporte.
            const prise =
              sequence?.phase === 'ramassage' &&
              sequence.prise.some((p) => memeCarte(p, c));

            const balayee =
              sequence?.phase === 'balayage' &&
              sequence.balayage?.cartes.some((p) => memeCarte(p, c));

            if (!prise && !balayee) return <View key={cle(c)}>{carte}</View>;

            const progression = prise ? ramassage : balayage;
            const beneficiaire = prise
              ? sequence!.joueur
              : sequence!.balayage!.joueur;
            const versLeHaut = beneficiaire === lui;

            return (
              <Animated.View
                key={cle(c)}
                style={{
                  opacity: progression.interpolate({
                    inputRange: [0, 0.65, 1],
                    outputRange: [1, 0.85, 0],
                  }),
                  transform: [
                    {
                      translateY: progression.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, versLeHaut ? -150 : 150],
                      }),
                    },
                    {
                      scale: progression.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 0.62],
                      }),
                    },
                  ],
                }}
              >
                {carte}
              </Animated.View>
            );
          })}
        </View>

      </View>

      {choisie && options.length > 1 && !sequence && (
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

      <View style={[styles.rangee, styles.rangeeMain]}>
        {emplacementsMain.map((c, i) =>
          c ? (
            <CarteVue
              key={cle(c)}
              carte={c}
              theme={theme}
              apparence={choisie && memeCarte(choisie, c) ? 'choisie' : 'neutre'}
                onPress={
                actif && !sequence && coupsDisponibles.length > 0
                  ? () => toucher(c)
                  : undefined
              }
            />
          ) : (
            <View key={`vide-${i}`} style={styles.emplacement} />
          ),
        )}
      </View>

      <BlocJoueur
        nom={nomJoueur}
        avatar={avatarJoueur}
        chkobbas={vue.chkobbas[moi]}
        actif={actif}
        secondes={secondes}
      />

      {sequence?.phase === 'revelation' && (
        <View
          style={[
            styles.revelation,
            sequence.joueur === lui ? styles.revelationHaut : styles.revelationBas,
          ]}
          pointerEvents="none"
        >
          {/* La carte se retourne sur place : elle s'aplatit puis se
              redéploie, comme une carte qu'on tourne face visible. */}
          <Animated.View
            style={{
              transform: [
                {
                  scaleX: apparition.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [1, 0.04, 1],
                  }),
                },
              ],
            }}
          >
            {/* Première moitié du mouvement : on voit encore le dos. */}
            <Animated.View style={{ opacity: apparition.interpolate({
              inputRange: [0, 0.49, 0.5, 1],
              outputRange: [1, 1, 0, 0],
            }) }}>
              <DosDeCarte />
            </Animated.View>

            <Animated.View
              style={[
                styles.faceRevelee,
                {
                  opacity: apparition.interpolate({
                    inputRange: [0, 0.49, 0.5, 1],
                    outputRange: [0, 0, 1, 1],
                  }),
                },
              ]}
            >
              <CarteVue carte={sequence.carte} theme={theme} apparence="visee" />
            </Animated.View>
          </Animated.View>
        </View>
      )}
      </View>
    </ScrollView>
  );
}

/**
 * Identité d'un joueur : photo, nom, chkobbas.
 *
 * La surbrillance de l'avatar remplace le texte « à vous de jouer » : c'est
 * plus rapide à lire, et ça reste vrai quand les deux joueurs sont nommés.
 */
function BlocJoueur({
  nom,
  avatar,
  chkobbas,
  actif,
  secondes,
}: {
  nom: string;
  avatar?: string;
  chkobbas: number;
  actif: boolean;
  secondes: number | null;
}) {
  const urgence = actif && secondes !== null && secondes <= 10;

  return (
    <View style={styles.joueur}>
      <View style={[styles.avatar, actif && styles.avatarActif]}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.photo} />
        ) : (
          <Text style={styles.initiale}>{nom.slice(0, 1).toUpperCase()}</Text>
        )}
      </View>

      <Text style={[styles.nom, actif && styles.nomActif]} numberOfLines={1}>
        {nom}
      </Text>

      <Text style={[styles.detail, urgence && styles.detailUrgent]} numberOfLines={1}>
        {chkobbas} chkobba{chkobbas > 1 ? 's' : ''}
        {actif && secondes !== null ? ` · ${secondes} s` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scene: { flex: 1, backgroundColor: PALETTE.tapis },
  contenu: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 22,
    gap: 10,
    flexGrow: 1,
  },

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

  // Absorbe toute la hauteur laissée libre par le bandeau, et centre la zone
  // de jeu dedans. Sur un grand écran, l'espace en trop se répartit au-dessus
  // et en dessous plutôt que d'étirer le tapis.
  zoneJeu: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: 10,
  },
  joueur: { alignItems: 'center', gap: 5 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: PALETTE.bordure,
    backgroundColor: 'rgba(6,40,36,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // La surbrillance remplace le texte « à vous de jouer ».
  avatarActif: {
    borderColor: PALETTE.laiton,
    borderWidth: 2.5,
    backgroundColor: 'rgba(200,145,47,0.18)',
  },
  photo: { width: '100%', height: '100%' },
  initiale: { color: PALETTE.sable, fontSize: 20, fontWeight: '500' },
  nom: { color: PALETTE.sable, fontSize: 14, height: 18 },
  nomActif: { color: PALETTE.ivoire, fontWeight: '500' },
  detail: {
    color: PALETTE.sable,
    fontSize: 12,
    height: 16,
    fontVariant: ['tabular-nums'],
  },
  detailUrgent: { color: '#e8a33d', fontWeight: '700' },
  annonce: { color: PALETTE.sable, fontSize: 13, fontStyle: 'italic', height: 18 },

  rangee: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Les mains ne dépassent jamais trois cartes : une rangée suffit, et la
  // hauteur figée empêche l'écran de sauter quand la main se vide.
  rangeeMain: { height: 90 },
  rangeeCentree: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Couche de révélation : par-dessus la zone de jeu, sans intercepter les
  // appuis. La carte s'affiche du côté de celui qui l'a jouée, devant sa
  // main, plutôt qu'au milieu du tapis où elle masquerait le jeu.
  revelation: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
  },
  faceRevelee: { position: 'absolute', top: 0, left: 0 },
  revelationHaut: { justifyContent: 'flex-start', paddingTop: 96 },
  revelationBas: { justifyContent: 'flex-end', paddingBottom: 96 },
  // Emplacement libre : même gabarit qu'une carte, tracé discrètement. Il
  // réserve la place et donne au tapis l'allure d'un plateau de jeu.
  emplacement: {
    width: 62,
    height: 90,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(240,226,196,0.10)',
  },

  tapis: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: PALETTE.bordure,
    backgroundColor: 'rgba(6,40,36,0.3)',
    gap: 8,
    justifyContent: 'center',
    marginVertical: 6,
  },
  pioche: { color: PALETTE.sable, fontSize: 11 },

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
