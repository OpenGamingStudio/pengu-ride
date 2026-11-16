# Accessibilité

- **Mouvements** : `prefers-reduced-motion` est respecté ; un bouton « Mouvements réduits » du menu le force. Il coupe secousse, particules, neige, parallaxe, fondu des zones et animations de l'interface (le jeu défile quand même : c'est son principe).
- **Contrastes** : texte encre `#14213d` sur blanc ou aplats clairs (> 7:1) ; boutons désactivés `#3a4a5c` sur `#c5d3dc`. Aucune information portée par la seule couleur.
- **Cibles** : tous les boutons font au moins 44 px ; aucun défilement horizontal de 320 à 1280 px.
- **Clavier** : tout le jeu et les menus se jouent au clavier ; focus visible (contour encre cerné de blanc).
- **Lecteurs d'écran** : région `aria-live` (début, zones, jalons de distance, poissons par dizaines, fin de partie, achats), boutons nommés, panneaux `role="dialog"`.
- **Sons** : coupables à tout moment (bouton du menu, touche M) ; rien ne démarre avant le premier geste.
- Mise en pause automatique si l'onglet perd le focus.
- Limites : non essayé sur un vrai lecteur d'écran ni sur téléphone physique.
