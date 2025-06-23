# Procédure de Test Manuel : Journal de Quêtes (QuestLog)

**Date du Test :** À remplir par le testeur
**Version du Build/Commit :** À remplir par le testeur
**Testeur :** À remplir par le testeur

## Prérequis

1.  Assurez-vous que l'application est lancée et accessible.
2.  Connectez-vous avec un compte utilisateur de test.
3.  L'utilisateur de test doit avoir :
    *   Quelques quêtes actives avec des progressions différentes (ex: 0/5, 2/3, 5/5 mais pas encore marquée comme complétée dans la collection `activeQuests`).
    *   Quelques quêtes dans la collection `completedQuests`.
    *   Idéalement, un utilisateur sans quêtes actives et/_ou sans quêtes terminées pour tester les états vides.
    *(Note : La création manuelle de ces données dans Firestore (via la console Firebase par exemple) pourrait être nécessaire si les mécanismes de jeu pour les obtenir ne sont pas encore implémentés ou testables facilement.)*

## Objectif du Test

Valider le fonctionnement et l'affichage du Journal de Quêtes accessible depuis la page du Hub.

## Scénarios de Test

### Scénario 1 : Accès et Affichage du Journal de Quêtes

| Étape | Action                                                                 | Résultat Attendu                                                                                                                                                                                             | Statut (Pass/Fail) | Notes |
| :---- | :--------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------- | :---- |
| 1.1   | Naviguer vers la page du Hub après connexion.                          | La page du Hub s'affiche correctement.                                                                                                                                                                       |                    |       |
| 1.2   | Localiser et cliquer sur le bouton "Journal de Quêtes".                | Un modal (fenêtre contextuelle) intitulé "Journal de Quêtes" (ou traduction équivalente) s'ouvre.                                                                                                             |                    |       |
| 1.3   | Observer le contenu initial du modal.                                  | L'onglet "Actives" (ou traduction) est sélectionné par défaut. La liste des quêtes actives de l'utilisateur s'affiche.                                                                                         |                    |       |
| 1.4   | Vérifier l'affichage de chaque quête active.                           | Pour chaque quête active : le titre est correct, la progression (ex: "Progrès : X / Y") est correcte et correspond aux données en base.                                                                        |                    |       |
| 1.5   | (Si applicable) Tester avec un utilisateur sans quêtes actives.        | Si l'utilisateur n'a pas de quêtes actives, un message approprié (ex: "Aucune quête active pour le moment") s'affiche sous l'onglet "Actives".                                                                 |                    |       |
| 1.6   | Cliquer sur le bouton de fermeture du modal (souvent un "X").          | Le modal du Journal de Quêtes se ferme. La page du Hub est de nouveau visible et interactive.                                                                                                                  |                    |       |
| 1.7   | Ré-ouvrir le modal en cliquant à nouveau sur "Journal de Quêtes".      | Le modal s'ouvre à nouveau, affichant par défaut l'onglet "Actives".                                                                                                                                           |                    |       |

### Scénario 2 : Navigation entre les Onglets et Affichage des Quêtes Terminées

| Étape | Action                                                                    | Résultat Attendu                                                                                                                                                                                                | Statut (Pass/Fail) | Notes |
| :---- | :------------------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------- | :---- |
| 2.1   | Avec le modal du Journal de Quêtes ouvert, cliquer sur l'onglet "Terminées" (ou traduction). | L'onglet "Terminées" devient actif. La liste des quêtes actives disparaît. La liste des quêtes terminées de l'utilisateur s'affiche.                                                                 |                    |       |
| 2.2   | Vérifier l'affichage de chaque quête terminée.                            | Pour chaque quête terminée : le titre est correct et une marque de complétion (ex: icône ✅) est visible. Le style visuel (ex: grisé, italique) indique qu'elle est terminée.                                        |                    |       |
| 2.3   | (Si applicable) Tester avec un utilisateur sans quêtes terminées.         | Si l'utilisateur n'a pas de quêtes terminées, un message approprié (ex: "Aucune quête terminée pour le moment") s'affiche sous l'onglet "Terminées".                                                                |                    |       |
| 2.4   | Re-cliquer sur l'onglet "Actives".                                        | L'onglet "Actives" redevient actif. La liste des quêtes terminées disparaît. La liste des quêtes actives de l'utilisateur s'affiche à nouveau correctement.                                                          |                    |       |
| 2.5   | Fermer le modal.                                                          | Le modal se ferme correctement.                                                                                                                                                                                 |                    |       |

### Scénario 3 : Comportement en cas d'absence d'utilisateur (Déconnexion)

| Étape | Action                                                                                                | Résultat Attendu                                                                                                                               | Statut (Pass/Fail) | Notes |
| :---- | :---------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------- | :----------------- | :---- |
| 3.1   | (Si possible) Se déconnecter pendant que le modal est ouvert, ou ouvrir le modal après déconnexion. | Le modal devrait afficher un message indiquant que l'utilisateur doit être connecté (ex: "Veuillez vous connecter pour voir vos quêtes").        |                    |       |
| 3.2   | (Si testé après déconnexion) Cliquer sur le bouton "Journal de Quêtes" sur la page du Hub.            | Si l'accès au Hub sans connexion est possible mais que le bouton est présent, le modal ouvert devrait afficher le message de connexion requise. |                    |       |

## Notes Additionnelles

*   Tester la réactivité (responsive design) du modal si cela fait partie des critères d'acceptation.
*   Vérifier l'absence d'erreurs dans la console du navigateur pendant les manipulations.
*   Les traductions doivent correspondre aux fichiers de localisation si d'autres langues sont testées.

---

Fin de la procédure de test.
