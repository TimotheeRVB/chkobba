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
import {
  Animated,
  Image,
  type LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { type Carte, type Coup, type Vue, coupsPour, prisesPossibles } from '../jeu';
import {
  CARTE_HAUTEUR,
  CARTE_LARGEUR,
  CarteVue,
  DosDeCarte,
  nomCarte,
  type NomTheme,
} from './Carte';
import { PALETTE } from './theme';
import Zellige from './Zellige';
import { BoutonMenu, Menu } from './Menu';
import { jouerSon } from '../sons';

const cle = (c: Carte) => `${c.couleur}-${c.valeur}`;
const memeCarte = (a: Carte, b: Carte) => a.couleur === b.couleur && a.valeur === b.valeur;

/** Une main ne dépasse jamais trois cartes. */
const EMPLACEMENTS_MAIN = 3;

/**
 * Emplacements réservés sur le tapis.
 *
 * Mesure sur 108 000 positions : cinq cartes ou moins dans 95 % des cas, huit
 * ou moins dans 99,8 %, dix au maximum.
 *
 * Avec les marges actuelles, quatre cartes tiennent par rangée dès 360 dp de
 * large : les huit emplacements occupent donc deux rangées. En dessous de
 * 360 dp il en faut trois, ce qui reste acceptable.
 */
const EMPLACEMENTS_TABLE = 8;

/** Durées, en millisecondes. Réglables sans rien casser. */
const REVELATION_MS = 320;
const PAUSE_MS = 340;
const RAMASSAGE_MS = 420;
const BALAYAGE_MS = 460;
const DEPOT_MS = 300;
const DISTRIBUTION_MS = 560;

/** Gabarit repris de Carte.tsx : une seule source pour tous les calculs. */
const HAUTEUR_CARTE = CARTE_HAUTEUR;
const LARGEUR_CARTE = CARTE_LARGEUR;
/** Écart entre le bord de la zone de jeu et la carte révélée. */
const MARGE_REVELATION = 96;
/** Décalage de la carte qui vient se poser sur sa prise. */
const CHEVAUCHEMENT = 24;

type Sequence = {
  joueur: 0 | 1;
  carte: Carte;
  prise: readonly Carte[];
  balayage?: { joueur: 0 | 1; cartes: readonly Carte[] };
  phase: 'revelation' | 'depot' | 'ramassage' | 'balayage';
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
  depot: Animated.Value;
  ramassage: Animated.Value;
  balayage: Animated.Value;
} {
  const [sequence, setSequence] = useState<Sequence | null>(null);
  const apparition = useRef(new Animated.Value(0)).current;
  const ramassage = useRef(new Animated.Value(0)).current;
  const balayage = useRef(new Animated.Value(0)).current;
  const depot = useRef(new Animated.Value(0)).current;
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
    const sien = dernierCoup?.joueur === moi;

    // Sa propre carte n'a pas à être révélée : on la montre déjà retournée,
    // en fixant l'avancement du retournement à son terme. Elle part ensuite
    // vers le tapis comme celle de l'adversaire.
    apparition.setValue(sien ? 1 : 0);
    depot.setValue(0);
    ramassage.setValue(0);
    balayage.setValue(0);

    setSequence(
      dernierCoup
        ? { ...dernierCoup, phase: sien ? 'depot' : 'revelation' }
        : null,
    );
  }

  /**
   * Chaque phase est jouée par un effet, et non dans la fonction de rappel de
   * la précédente.
   *
   * C'est indispensable : passer à la phase suivante déclenche un rendu, et
   * l'animation doit démarrer une fois ce rendu affiché. Lancée trop tôt, elle
   * s'applique à une vue qui ne porte pas encore la transformation — et le
   * pilote natif n'anime rien. C'est ce qui faisait que seule la première
   * carte se déplaçait.
   */
  useEffect(() => {
    if (!sequence) return;

    const { phase, prise, balayage: bal } = sequence;
    const avancer = (suivante: Sequence['phase']) =>
      setSequence((s) => (s ? { ...s, phase: suivante } : null));
    const terminer = () => setSequence(null);

    const apresLeDepot = () => {
      if (prise.length > 0) return avancer('ramassage');
      if (bal) return avancer('balayage');
      terminer();
    };

    let animation: Animated.CompositeAnimation;

    switch (phase) {
      case 'revelation':
        animation = Animated.sequence([
          Animated.timing(apparition, {
            toValue: 1,
            duration: REVELATION_MS,
            useNativeDriver: true,
          }),
          Animated.delay(PAUSE_MS),
        ]);
        animation.start(({ finished }) => finished && avancer('depot'));
        break;

      case 'depot':
        animation = Animated.timing(depot, {
          toValue: 1,
          duration: DEPOT_MS,
          useNativeDriver: true,
        });
        animation.start(({ finished }) => finished && apresLeDepot());
        break;

      case 'ramassage':
        animation = Animated.timing(ramassage, {
          toValue: 1,
          duration: RAMASSAGE_MS,
          useNativeDriver: true,
        });
        animation.start(({ finished }) => {
          if (!finished) return;
          bal ? avancer('balayage') : terminer();
        });
        break;

      case 'balayage':
        animation = Animated.timing(balayage, {
          toValue: 1,
          duration: BALAYAGE_MS,
          useNativeDriver: true,
        });
        animation.start(({ finished }) => finished && terminer());
        break;
    }

    return () => animation.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, sequence?.phase]);

  return { sequence, apparition, depot, ramassage, balayage };
}

type Props = {
  vue: Vue;
  theme: NomTheme;
  /** Changement d'habillage, depuis le menu de partie. */
  onTheme: (t: NomTheme) => void;
  /** Quitter la partie depuis le menu. */
  onQuitter?: () => void;
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
  onQuitter,
  nomJoueur = 'Vous',
  avatarJoueur,
  avatarAdversaire,
  gele = false,
  secondes = null,
}: Props) {
  const [choisie, setChoisie] = useState<Carte | null>(null);
  const [menuOuvert, setMenuOuvert] = useState(false);

  const moi = vue.moi;
  const lui = moi === 0 ? 1 : 0;

  const options = useMemo(
    () => (choisie ? prisesPossibles(vue.table, choisie.valeur) : []),
    [choisie, vue.table],
  );

  const visees = useMemo(() => new Set(options.flat().map(cle)), [options]);

  const actif = vue.aMoiDeJouer && !gele;

  /**
   * Part du temps restante, pour la barre sous l'avatar.
   *
   * Le serveur n'envoie que les secondes restantes, pas la durée totale du
   * tour. La première valeur reçue après un changement de main fait donc
   * office de maximum.
   */
  const [maxSecondes, setMaxSecondes] = useState(1);

  useEffect(() => {
    setMaxSecondes(secondes ?? 1);
  }, [vue.aMoiDeJouer]);

  useEffect(() => {
    if (secondes !== null) setMaxSecondes((m) => (secondes > m ? secondes : m));
  }, [secondes]);

  const fraction =
    secondes === null ? null : Math.min(1, secondes / Math.max(1, maxSecondes));

  const { sequence, apparition, depot, ramassage, balayage } =
    useSequence(vue.dernierCoup, moi);

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
    //
    // Les cartes de la prise, elles, ne sont réaffichées que jusqu'à la fin
    // du ramassage. Passé ce point elles sont dans le paquet : les garder
    // dans la liste les ferait réapparaître à leur emplacement pendant le
    // balayage final.
    return [
      ...vue.table,
      ...(sequence.phase === 'balayage' ? [] : sequence.prise),
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

  // Le compteur des paquets attend que les cartes soient arrivées.
  const ramasseesAvant = useRef<Record<number, number>>({
    [moi]: vue.mesRamassees.length,
    [lui]: vue.ramasseesAdversaire,
  });

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
    ramasseesAvant.current = {
      [moi]: vue.mesRamassees.length,
      [lui]: vue.ramasseesAdversaire,
    };
  }, [
    sequence,
    vue.maMain,
    vue.cartesAdversaire,
    vue.mesRamassees.length,
    vue.ramasseesAdversaire,
    moi,
    lui,
  ]);

  /**
   * Deux mesures suffisent à calculer le trajet de la carte vers le tapis :
   * la hauteur de la zone de jeu, et la position du tapis dedans. Elles
   * arrivent par onLayout, donc sans supposition sur la taille de l'écran.
   */
  const [zone, setZone] = useState({ largeur: 0, hauteur: 0 });
  const [tapis, setTapis] = useState({ x: 0, y: 0, hauteur: 0 });
  const [rangee, setRangee] = useState({ x: 0, y: 0 });
  const [places, setPlaces] = useState<Record<number, { x: number; y: number }>>({});
  const [cibles, setCibles] = useState<Record<number, { x: number; y: number }>>({});

  const [zoneMain, setZoneMain] = useState({ x: 0, y: 0 });
  const [placesMain, setPlacesMain] = useState<Record<number, { x: number; y: number }>>({});

  const noterPlaceMain = (i: number) => (e: LayoutChangeEvent) => {
    const { x, y } = e.nativeEvent.layout;
    setPlacesMain((p) => (p[i]?.x === x && p[i]?.y === y ? p : { ...p, [i]: { x, y } }));
  };

  const noterCible = (joueur: 0 | 1) => (position: { x: number; y: number }) =>
    setCibles((c) =>
      c[joueur]?.x === position.x && c[joueur]?.y === position.y
        ? c
        : { ...c, [joueur]: position },
    );

  /**
   * Position de chaque emplacement, relevée à la mise en page.
   *
   * Les huit emplacements sont rendus en permanence, occupés ou non : leurs
   * coordonnées sont donc connues bien avant qu'une carte n'y soit envoyée.
   * On ne remplace la valeur que si elle a réellement changé, sinon chaque
   * mesure déclencherait un nouveau rendu, qui déclencherait une mesure.
   */
  const noterPlace = (i: number) => (e: LayoutChangeEvent) => {
    const { x, y } = e.nativeEvent.layout;
    setPlaces((p) => (p[i]?.x === x && p[i]?.y === y ? p : { ...p, [i]: { x, y } }));
  };

  /**
   * Les sons suivent les phases de l'animation, jamais l'état du moteur.
   *
   * Le moteur a déjà tout appliqué au moment où la vue arrive : jouer le son
   * à ce moment-là le décalerait d'une bonne seconde par rapport à ce que
   * l'écran montre.
   */
  useEffect(() => {
    if (!sequence) return;
    if (sequence.phase === 'depot' && sequence.prise.length === 0) jouerSon('poser');
    if (sequence.phase === 'ramassage') jouerSon('prendre');
    if (sequence.phase === 'balayage') jouerSon('prendre');
  }, [sequence?.phase]);

  /**
   * L'arrivée de nouvelles cartes en main.
   *
   * Le moteur redistribue dès que les deux mains sont vides ; l'affichage,
   * lui, l'a retenu jusqu'à la fin de l'animation. C'est donc au moment où la
   * main affichée se regarnit que la distribution devient visible — et c'est
   * là que le son et le mouvement doivent se produire.
   */
  const distribution = useRef(new Animated.Value(1)).current;
  const tailleMainAvant = useRef(mainAffichee.length);

  useEffect(() => {
    if (mainAffichee.length > tailleMainAvant.current) {
      jouerSon('distribuer');
      distribution.setValue(0);
      Animated.timing(distribution, {
        toValue: 1,
        duration: DISTRIBUTION_MS,
        useNativeDriver: true,
      }).start();
    }
    tailleMainAvant.current = mainAffichee.length;
  }, [mainAffichee.length]);

  /**
   * Entrée en scène d'une carte distribuée.
   *
   * Une seule valeur animée pilote les trois cartes : le décalage des plages
   * d'interpolation suffit à les faire arriver l'une après l'autre.
   */
  const arrivee = (rang: number, depuisLeHaut: boolean) => {
    const debut = rang * 0.16;
    const options = { extrapolate: 'clamp' as const };
    const distance = depuisLeHaut ? -110 : 110;

    return {
      opacity: distribution.interpolate({
        inputRange: [debut, debut + 0.35],
        outputRange: [0, 1],
        ...options,
      }),
      transform: [
        {
          translateY: distribution.interpolate({
            inputRange: [debut, debut + 0.55],
            outputRange: [distance, 0],
            ...options,
          }),
        },
        {
          scale: distribution.interpolate({
            inputRange: [debut, debut + 0.55],
            outputRange: [0.8, 1],
            ...options,
          }),
        },
      ],
    };
  };

  // Une chkobba se reconnaît à l'incrément du compteur.
  const chkobbasAvant = useRef(vue.chkobbas[0] + vue.chkobbas[1]);
  useEffect(() => {
    const total = vue.chkobbas[0] + vue.chkobbas[1];
    if (total > chkobbasAvant.current) jouerSon('chkobba');
    chkobbasAvant.current = total;
  }, [vue.chkobbas]);

  const emplacementsTable = useEmplacements(cartesAffichees, EMPLACEMENTS_TABLE);
  const emplacementsMain = useEmplacements(mainAffichee, EMPLACEMENTS_MAIN);

  /**
   * La répartition de la main juste avant le coup.
   *
   * Au moment où la séquence démarre, la carte jouée a déjà quitté la main :
   * son emplacement est libéré. Pour faire partir l'animation de là où elle
   * était, il faut avoir gardé l'état précédent.
   */
  const mainRepartieAvant = useRef<(Carte | null)[]>(emplacementsMain);
  useEffect(() => {
    if (!sequence) mainRepartieAvant.current = emplacementsMain;
  });

  /**
   * Le trajet de la carte jouée, de la zone de révélation jusqu'à son
   * emplacement exact sur le tapis.
   *
   * Les coordonnées s'additionnent en cascade : l'emplacement est mesuré dans
   * la rangée, la rangée dans le tapis, le tapis dans la zone de jeu. Si
   * l'emplacement n'a pas encore été mesuré, on vise le centre du tapis —
   * moins précis, mais jamais absurde.
   */
  const trajet = useMemo(() => {
    const immobile = {
      debut: { x: 0, y: 0 },
      fin: { x: 0, y: 0 },
      arrivee: null as { x: number; y: number } | null,
    };
    if (!zone.hauteur || !tapis.hauteur || !sequence) return immobile;

    // La couche de révélation place la carte ici : tout se calcule en écart
    // par rapport à ce point.
    const socleX = (zone.largeur - LARGEUR_CARTE) / 2;
    const socleY =
      sequence.joueur === lui
        ? MARGE_REVELATION
        : zone.hauteur - MARGE_REVELATION - HAUTEUR_CARTE;

    /** Position absolue d'un emplacement du tapis, dans la zone de jeu. */
    const situer = (i: number) => {
      const place = places[i];
      if (!place) return null;
      return { x: tapis.x + rangee.x + place.x, y: tapis.y + rangee.y + place.y };
    };

    // Arrivée. Avec prise, la carte vient se poser sur les cartes qu'elle
    // ramasse, légèrement décalée du côté de celui qui joue. Sans prise, elle
    // rejoint son propre emplacement.
    let arrivee: { x: number; y: number } | null = null;

    if (sequence.prise.length > 0) {
      const cibles = sequence.prise
        .map((c) => emplacementsTable.findIndex((e) => e && memeCarte(e, c)))
        .map(situer)
        .filter((p): p is { x: number; y: number } => p !== null);

      if (cibles.length > 0) {
        const decalage = sequence.joueur === lui ? -CHEVAUCHEMENT : CHEVAUCHEMENT;
        arrivee = {
          x: cibles.reduce((t, p) => t + p.x, 0) / cibles.length,
          y: cibles.reduce((t, p) => t + p.y, 0) / cibles.length + decalage,
        };
      }
    } else {
      const i = emplacementsTable.findIndex(
        (c) => c && memeCarte(c, sequence.carte),
      );
      arrivee = i >= 0 ? situer(i) : null;
    }

    if (!arrivee) {
      arrivee = {
        x: socleX,
        y: tapis.y + tapis.hauteur / 2 - HAUTEUR_CARTE / 2,
      };
    }

    const fin = { x: arrivee.x - socleX, y: arrivee.y - socleY };

    // Départ : pour sa propre carte, l'emplacement qu'elle occupait dans la
    // main. Pour celle de l'adversaire, la zone de révélation elle-même.
    if (sequence.joueur === lui) return { debut: { x: 0, y: 0 }, fin, arrivee };

    const iMain = mainRepartieAvant.current.findIndex(
      (c) => c && memeCarte(c, sequence.carte),
    );
    const placeMain = iMain >= 0 ? placesMain[iMain] : undefined;
    if (!placeMain) return { debut: { x: 0, y: 0 }, fin, arrivee };

    return {
      debut: {
        x: zoneMain.x + placeMain.x - socleX,
        y: zoneMain.y + placeMain.y - socleY,
      },
      fin,
      arrivee,
    };
  }, [
    zone,
    tapis,
    rangee,
    places,
    zoneMain,
    placesMain,
    sequence,
    lui,
    emplacementsTable,
  ]);

  /** De l'endroit où la carte jouée s'est posée jusqu'au paquet du gagnant. */
  const versLePaquet = useMemo(() => {
    if (!sequence || !trajet.arrivee) return { x: 0, y: 0 };
    const paquet = cibles[sequence.joueur];
    if (!paquet) return { x: 0, y: sequence.joueur === lui ? -150 : 150 };
    return { x: paquet.x - trajet.arrivee.x, y: paquet.y - trajet.arrivee.y };
  }, [sequence, trajet, cibles, lui]);

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
    <View style={styles.salle}>
      <Zellige />
      <BoutonMenu onPress={() => setMenuOuvert(true)} />

      <Menu
        visible={menuOuvert}
        theme={theme}
        onTheme={onTheme}
        onFermer={() => setMenuOuvert(false)}
        onQuitter={
          onQuitter
            ? () => {
                setMenuOuvert(false);
                onQuitter();
              }
            : undefined
        }
      />

      <ScrollView style={styles.scene} contentContainerStyle={styles.contenu}>
      <View
        style={styles.zoneJeu}
        onLayout={(e) =>
          setZone({
            largeur: e.nativeEvent.layout.width,
            hauteur: e.nativeEvent.layout.height,
          })
        }
      >
      <BlocJoueur
        nom={legendeAdversaire}
        avatar={avatarAdversaire}
        chkobbas={vue.chkobbas[lui]}
        aDesCartes={
          (sequence ? ramasseesAvant.current[lui]! : vue.ramasseesAdversaire) > 0
        }
        actif={!vue.aMoiDeJouer}
        secondes={secondes}
        fraction={fraction}
        onCible={noterCible(lui)}
      />
      {/* Les dos occupent des emplacements fixes. On ne connaît pas la carte
          jouée par l'adversaire, donc c'est le dernier emplacement qui se
          libère — les autres ne bougent pas d'un pixel. */}
      <View style={[styles.rangee, styles.rangeeMain]}>
        {Array.from({ length: EMPLACEMENTS_MAIN }).map((_, i) =>
          i < cartesAdversaire ? (
            <Animated.View key={`dos-${i}`} style={arrivee(i, false)}>
              <DosDeCarte theme={theme} />
            </Animated.View>
          ) : (
            <View key={`vide-${i}`} style={styles.emplacement} />
          ),
        )}
      </View>

      <Text style={styles.annonce} numberOfLines={1}>
        {vue.dernierCoup && vue.dernierCoup.joueur === lui
          ? `a joué ${nomCarte(vue.dernierCoup.carte)}` +
            (vue.dernierCoup.prise.length > 0
              ? ` et pris ${vue.dernierCoup.prise.map(nomCarte).join(' + ')}`
              : ' sans prendre')
          : ' '}
      </Text>

      <View
        style={styles.tapis}
        onLayout={(e) =>
          setTapis({
            x: e.nativeEvent.layout.x,
            y: e.nativeEvent.layout.y,
            hauteur: e.nativeEvent.layout.height,
          })
        }
      >
        <View style={styles.filet} pointerEvents="none" />
        <Text style={styles.pioche}>
          {vue.pioche} en pioche · {vue.mesRamassees.length} carte
          {vue.mesRamassees.length > 1 ? 's' : ''} gagnée
          {vue.mesRamassees.length > 1 ? 's' : ''}
        </Text>
        <View
          style={styles.rangeeCentree}
          onLayout={(e) =>
            setRangee({ x: e.nativeEvent.layout.x, y: e.nativeEvent.layout.y })
          }
        >
          {emplacementsTable.map((c, i) => {
            if (!c) {
              return (
                <View
                  key={`vide-${i}`}
                  style={styles.emplacement}
                  onLayout={noterPlace(i)}
                />
              );
            }

            // Pendant qu'elle se retourne au centre, la carte jouée laisse
            // son emplacement visible mais vide. Elle s'y posera à la fin.
            if (
              (sequence?.phase === 'revelation' || sequence?.phase === 'depot') &&
              memeCarte(c, sequence.carte)
            ) {
              return (
                <View key={cle(c)} style={styles.emplacement} onLayout={noterPlace(i)} />
              );
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

            if (!prise && !balayee) {
              return (
                <View key={cle(c)} onLayout={noterPlace(i)}>
                  {carte}
                </View>
              );
            }

            const progression = prise ? ramassage : balayage;
            const beneficiaire = prise
              ? sequence!.joueur
              : sequence!.balayage!.joueur;

            // La carte rejoint le paquet de celui qui l'emporte. Faute de
            // mesure, on retombe sur un simple glissement vers son camp.
            const cible = cibles[beneficiaire];
            const place = places[i];
            const depart = place
              ? { x: tapis.x + rangee.x + place.x, y: tapis.y + rangee.y + place.y }
              : null;

            const vers =
              cible && depart
                ? { x: cible.x - depart.x, y: cible.y - depart.y }
                : { x: 0, y: beneficiaire === lui ? -150 : 150 };

            return (
              <Animated.View
                key={cle(c)}
                onLayout={noterPlace(i)}
                style={{
                  opacity: progression.interpolate({
                    inputRange: [0, 0.8, 1],
                    outputRange: [1, 1, 0],
                  }),
                  transform: [
                    {
                      translateX: progression.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, vers.x],
                      }),
                    },
                    {
                      translateY: progression.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, vers.y],
                      }),
                    },
                    {
                      scale: progression.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 0.34],
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
            Avec le {nomCarte(choisie)}, vous pouvez prendre :
          </Text>
          <View style={styles.rangee}>
            {options.map((prise, i) => (
              <Pressable
                key={i}
                style={styles.option}
                onPress={() => jouer({ carte: choisie, prise })}
              >
                <Text style={styles.texteOption}>
                  {prise.map(nomCarte).join(' + ')}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <View
        style={[styles.rangee, styles.rangeeMain]}
        onLayout={(e) =>
          setZoneMain({ x: e.nativeEvent.layout.x, y: e.nativeEvent.layout.y })
        }
      >
        {emplacementsMain.map((c, i) =>
          c ? (
            <Animated.View key={cle(c)} onLayout={noterPlaceMain(i)} style={arrivee(i, true)}>
              <CarteVue
                carte={c}
                theme={theme}
                apparence={choisie && memeCarte(choisie, c) ? 'choisie' : 'neutre'}
                onPress={
                  actif && !sequence && coupsDisponibles.length > 0
                    ? () => toucher(c)
                    : undefined
                }
              />
            </Animated.View>
          ) : (
            <View
              key={`vide-${i}`}
              style={styles.emplacement}
              onLayout={noterPlaceMain(i)}
            />
          ),
        )}
      </View>

      <BlocJoueur
        nom={nomJoueur}
        avatar={avatarJoueur}
        chkobbas={vue.chkobbas[moi]}
        score={`${vue.scores[moi]} – ${vue.scores[lui]}`}
        aDesCartes={
          (sequence ? ramasseesAvant.current[moi]! : vue.mesRamassees.length) > 0
        }
        actif={actif}
        secondes={secondes}
        fraction={fraction}
        onCible={noterCible(moi)}
      />

      {(sequence?.phase === 'revelation' ||
        sequence?.phase === 'depot' ||
        (sequence?.phase === 'ramassage' && sequence.prise.length > 0)) && (
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
              // Pas de fondu pendant le dépôt : la carte atterrit exactement
              // là où il faut, le relais est invisible. Le seul fondu est
              // celui de la fin du ramassage.
              opacity: ramassage.interpolate({
                inputRange: [0, 0.8, 1],
                outputRange: [1, 1, 0],
              }),
              transform: [
                {
                  translateX: depot.interpolate({
                    inputRange: [0, 1],
                    outputRange: [trajet.debut.x, trajet.fin.x],
                  }),
                },
                {
                  translateY: depot.interpolate({
                    inputRange: [0, 1],
                    outputRange: [trajet.debut.y, trajet.fin.y],
                  }),
                },
                // Puis, avec sa prise, elle file vers le paquet.
                {
                  translateX: ramassage.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, versLePaquet.x],
                  }),
                },
                {
                  translateY: ramassage.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, versLePaquet.y],
                  }),
                },
                {
                  scale: ramassage.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0.34],
                  }),
                },
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
    </View>
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
  score,
  aDesCartes,
  actif,
  secondes,
  fraction,
  onCible,
}: {
  nom: string;
  avatar?: string;
  chkobbas: number;
  /** Score de la partie, déjà mis en forme. Absent chez l'adversaire. */
  score?: string;
  /** Le paquet contient-il des cartes ? Son contenu, lui, reste secret. */
  aDesCartes: boolean;
  actif: boolean;
  secondes: number | null;
  /** Part du temps restante, de 1 à 0. Alimente la barre sous l'avatar. */
  fraction: number | null;
  /** Position du paquet dans la zone de jeu : cible des cartes ramassées. */
  onCible?: (position: { x: number; y: number }) => void;
}) {
  const urgence = actif && secondes !== null && secondes <= 10;

  // Trois mesures emboîtées à additionner pour situer le paquet.
  const bloc = useRef({ x: 0, y: 0 });
  const ligne = useRef({ x: 0, y: 0 });
  const paquet = useRef({ x: 0, y: 0 });

  const publier = () => {
    onCible?.({
      x: bloc.current.x + ligne.current.x + paquet.current.x,
      y: bloc.current.y + ligne.current.y + paquet.current.y,
    });
  };

  const relever =
    (cible: { current: { x: number; y: number } }) => (e: LayoutChangeEvent) => {
      cible.current = { x: e.nativeEvent.layout.x, y: e.nativeEvent.layout.y };
      publier();
    };

  return (
    <View style={styles.joueur} onLayout={relever(bloc)}>
      <View style={styles.ligneAvatar} onLayout={relever(ligne)}>
        {/* L'espace symétrique du paquet accueille le score, affiché du seul
            côté du joueur : vous d'abord, l'adversaire ensuite. */}
        <View style={styles.cale}>
          {score && (
            <Text style={styles.score} numberOfLines={1}>
              {score}
            </Text>
          )}
        </View>

        <View style={[styles.avatar, actif && styles.avatarActif]}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.photo} />
          ) : (
            <Text style={styles.initiale}>{nom.slice(0, 1).toUpperCase()}</Text>
          )}
        </View>

        {/* Le paquet ne dit rien de son contenu : ni le nombre de cartes, ni
            ce qu'il y a dedans. C'est la règle de cette variante. */}
        <View
          style={[styles.paquet, !aDesCartes && styles.paquetVide]}
          onLayout={relever(paquet)}
        />
      </View>

      {/* Barre de temps : se lit d'un coup d'œil, sans quitter le tapis. */}
      <View style={styles.jauge}>
        {actif && fraction !== null && (
          <View
            style={[
              styles.jaugeRemplie,
              urgence && styles.jaugeUrgente,
              { width: `${Math.round(fraction * 100)}%` },
            ]}
          />
        )}
      </View>

      <Text style={[styles.nom, actif && styles.nomActif]} numberOfLines={1}>
        {nom}
      </Text>

      <Text style={styles.detail} numberOfLines={1}>
        {chkobbas} chkobba{chkobbas > 1 ? 's' : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  salle: { flex: 1, backgroundColor: PALETTE.nuit },
  scene: { flex: 1, backgroundColor: 'transparent' },
  contenu: {
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 18,
    gap: 10,
    flexGrow: 1,
  },



  // Occupe tout l'écran et centre la zone de jeu dedans. Sur un grand écran,
  // l'espace en trop se répartit au-dessus et en dessous plutôt que d'étirer
  // le tapis.
  zoneJeu: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: 10,
  },
  joueur: { alignItems: 'center', gap: 5 },
  ligneAvatar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  // Le paquet des cartes gagnées, cible des animations de ramassage.
  paquet: {
    width: 34,
    height: 48,
    // Les marges portent l'encombrement du paquet à la largeur de la cale,
    // pour que l'avatar reste centré malgré le score à gauche.
    marginHorizontal: 11,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: PALETTE.laitonPale,
    backgroundColor: '#123f52',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paquetVide: { backgroundColor: 'transparent', borderColor: 'rgba(242,230,204,0.12)' },
  cale: { width: 56, alignItems: 'center' },
  score: {
    color: PALETTE.laiton,
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  // Hauteur réservée en permanence : la barre apparaît et disparaît sans
  // faire bouger le reste.
  jauge: {
    width: 52,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(240,226,196,0.12)',
    overflow: 'hidden',
  },
  jaugeRemplie: { height: 3, borderRadius: 2, backgroundColor: PALETTE.laiton },
  jaugeUrgente: { backgroundColor: '#e8a33d' },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: PALETTE.laitonPale,
    backgroundColor: 'rgba(10,34,51,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // La surbrillance remplace le texte « à vous de jouer ».
  avatarActif: {
    borderColor: PALETTE.laiton,
    borderWidth: 2.5,
    backgroundColor: 'rgba(192,138,46,0.2)',
    shadowColor: PALETTE.laiton,
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
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
  rangeeMain: { height: CARTE_HAUTEUR },
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
    width: CARTE_LARGEUR,
    height: CARTE_HAUTEUR,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(242,230,204,0.12)',
  },

  // Le tapis de jeu, traité comme un plateau de laiton posé sur la table :
  // cerclage doré, feutre vert au centre, et un filet intérieur qui donne
  // l'épaisseur du métal.
  tapis: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: PALETTE.laitonPale,
    backgroundColor: PALETTE.tapis,
    gap: 8,
    justifyContent: 'center',
    marginVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  filet: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(192,138,46,0.22)',
  },
  pioche: { color: PALETTE.sable, fontSize: 11 },

  choix: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: PALETTE.laitonPale,
    backgroundColor: 'rgba(10,34,51,0.7)',
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
