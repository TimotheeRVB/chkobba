/**
 * Connexion à une partie en ligne.
 *
 * Le client n'est jamais autoritaire : il envoie un coup, le serveur décide,
 * et renvoie la vue qui fait foi. En cas de refus, on réaffiche simplement ce
 * que le serveur dit — pas de correction locale, pas de désynchronisation.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Coup, Decompte, Joueur, Vue } from '../jeu';
import { obtenirJeton } from '../stockage';

export type Statut =
  | 'connexion'
  | 'injoignable'
  | 'attente'
  | 'jeu'
  | 'complet'
  | 'adversaireParti'
  | 'coupe';

type MessageServeur =
  | { t: 'place'; siege: Joueur; code: string }
  | { t: 'attente' }
  | {
      t: 'vue';
      vue: Vue;
      decompte: Decompte | null;
      gagnant: Joueur | null;
      restant: number | null;
      automatique: boolean;
      abandon: Joueur | null;
    }
  | { t: 'refus'; raison: string }
  | { t: 'complet' }
  | { t: 'adversaireParti' };

export type PartieEnLigne = {
  vue: Vue | null;
  decompte: Decompte | null;
  gagnant: Joueur | null;
  statut: Statut;
  refus: string | null;
  /** Détail technique de la dernière coupure, pour le diagnostic. */
  detail: string | null;
  /** Nombre de tentatives de connexion échouées d'affilée. */
  tentatives: number;
  /** Secondes restantes au joueur dont c'est le tour. */
  secondes: number | null;
  /** Le dernier coup a-t-il été joué par le serveur ? */
  automatique: boolean;
  /** Siège du joueur ayant abandonné. */
  abandon: Joueur | null;
  jouer: (coup: Coup) => void;
  rafraichir: () => void;
};

export function usePartieEnLigne(adresse: string, code: string): PartieEnLigne {
  const [vue, setVue] = useState<Vue | null>(null);
  const [decompte, setDecompte] = useState<Decompte | null>(null);
  const [gagnant, setGagnant] = useState<Joueur | null>(null);
  const [statut, setStatut] = useState<Statut>('connexion');
  const [refus, setRefus] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [tentatives, setTentatives] = useState(0);

  const [automatique, setAutomatique] = useState(false);
  const [abandon, setAbandon] = useState<Joueur | null>(null);
  const [secondes, setSecondes] = useState<number | null>(null);

  const [jeton, setJeton] = useState<string | null>(null);
  const socket = useRef<WebSocket | null>(null);

  // Le serveur envoie un délai en millisecondes ; on le décompte localement
  // plutôt que de comparer deux horloges qui ne sont jamais d'accord.
  const echeance = useRef<number | null>(null);

  useEffect(() => {
    const battement = setInterval(() => {
      if (echeance.current === null) return setSecondes(null);
      setSecondes(Math.max(0, Math.ceil((echeance.current - Date.now()) / 1000)));
    }, 500);
    return () => clearInterval(battement);
  }, []);

  // Le jeton vient du stockage de l'appareil : il faut l'attendre avant de
  // se connecter, sinon le serveur nous donnerait un nouveau siège.
  useEffect(() => {
    let actif = true;
    obtenirJeton().then((valeur) => {
      if (actif) setJeton(valeur);
    });
    return () => {
      actif = false;
    };
  }, []);

  useEffect(() => {
    if (!jeton) return;

    // Ce drapeau appartient à CETTE exécution de l'effet. En développement,
    // React monte les composants deux fois : sans cela, la fermeture de la
    // première connexion viendrait perturber la seconde.
    let actif = true;
    let minuteur: ReturnType<typeof setTimeout> | undefined;
    let echecs = 0;

    const connecter = () => {
      if (!actif) return;

      const url = `${adresse}/partie/${encodeURIComponent(code)}?jeton=${jeton}`;
      let ws: WebSocket;

      try {
        ws = new WebSocket(url);
      } catch {
        setStatut('injoignable');
        setDetail(`Adresse invalide : ${url}`);
        return;
      }

      socket.current = ws;
      let ouverte = false;

      ws.onopen = () => {
        if (!actif) return;
        ouverte = true;
        echecs = 0;
        setTentatives(0);
        setDetail(null);
        setStatut('connexion');
      };

      ws.onmessage = (evenement) => {
        if (!actif) return;

        let message: MessageServeur;
        try {
          message = JSON.parse(String(evenement.data)) as MessageServeur;
        } catch {
          return;
        }

        switch (message.t) {
          case 'attente':
            setStatut('attente');
            break;
          case 'complet':
            setStatut('complet');
            break;
          case 'adversaireParti':
            setStatut('adversaireParti');
            break;
          case 'vue':
            setVue(message.vue);
            setDecompte(message.decompte);
            setGagnant(message.gagnant);
            setAutomatique(message.automatique);
            setAbandon(message.abandon);
            echeance.current =
              message.restant === null ? null : Date.now() + message.restant;
            setRefus(null);
            setStatut('jeu');
            break;
          case 'refus':
            setRefus(message.raison);
            break;
        }
      };

      ws.onclose = (evenement) => {
        // Une connexion abandonnée par un montage précédent ne doit rien
        // changer à l'état affiché.
        if (!actif || socket.current !== ws) return;

        echecs++;
        setTentatives(echecs);
        setDetail(
          `code ${evenement.code}${evenement.reason ? ' — ' + evenement.reason : ''} · ${adresse}`,
        );

        // Jamais ouverte = serveur injoignable. Ouverte puis fermée = vraie
        // coupure, dont on peut espérer se remettre.
        setStatut(ouverte ? 'coupe' : 'injoignable');

        minuteur = setTimeout(connecter, Math.min(1000 * echecs, 8000));
      };

      ws.onerror = () => {
        // L'événement d'erreur ne dit rien d'exploitable dans un navigateur :
        // c'est la fermeture qui suit qui portera l'information.
        try {
          ws.close();
        } catch {
          /* déjà fermée */
        }
      };
    };

    connecter();

    return () => {
      actif = false;
      if (minuteur) clearTimeout(minuteur);
      const ws = socket.current;
      socket.current = null;
      ws?.close();
    };
  }, [adresse, code, jeton]);

  const envoyer = useCallback((charge: object) => {
    const ws = socket.current;
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(charge));
  }, []);

  const jouer = useCallback((coup: Coup) => envoyer({ t: 'jouer', coup }), [envoyer]);
  const rafraichir = useCallback(() => envoyer({ t: 'rafraichir' }), [envoyer]);

  return {
    vue,
    decompte,
    gagnant,
    statut,
    refus,
    detail,
    tentatives,
    secondes,
    automatique,
    abandon,
    jouer,
    rafraichir,
  };
}
