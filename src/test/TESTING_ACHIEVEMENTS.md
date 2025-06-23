# Procédure de Test Manuel : Statistiques et Hauts Faits

**Date du Test :** À remplir par le testeur
**Version du Build/Commit :** À remplir par le testeur
**Testeur :** À remplir par le testeur

## Prérequis

1.  Assurez-vous que l'application est lancée et accessible.
2.  Connectez-vous avec un compte utilisateur de test.
3.  **Important :** Pour tester le déblocage de Hauts Faits et l'incrémentation des statistiques, il est crucial de pouvoir simuler les actions en jeu ou de modifier directement les données utilisateur dans Firestore avant de charger la Page de Profil.
    *   **Option A (Actions en jeu) :** Si les mécaniques de jeu sont fonctionnelles (fin de partie, lancement de sorts, complétion de quêtes, révisions SRS).
    *   **Option B (Modification manuelle Firestore) :**
        *   Accéder à la console Firebase -> Firestore Database.
        *   Localiser le document de l'utilisateur de test dans la collection `users`.
        *   Modifier le champ `stats` (ex: mettre `duelsWon` à 9 pour tester le déblocage d'un HF à 10).
        *   Modifier le champ `unlockedAchievements` (ex: retirer un ID d'HF pour tester son redéblocage et la notification toast).
4.  Connaître les définitions des Hauts Faits (ID, statistique liée, seuil) disponibles dans `src/data/achievementDefinitions.ts` pour savoir quoi viser.

## Objectif du Test

Valider l'affichage des statistiques, le déblocage et l'affichage des Hauts Faits, ainsi que les notifications toast associées.

## Scénarios de Test

### Scénario 1 : Affichage des Statistiques et Hauts Faits sur la Page de Profil

| Étape | Action                                                                 | Résultat Attendu                                                                                                                                                                                             | Statut (Pass/Fail) | Notes |
| :---- | :--------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------- | :---- |
| 1.1   | Naviguer vers la Page de Profil (`/profile`).                          | La page de profil se charge.                                                                                                                                                                                 |                    |       |
| 1.2   | Localiser la section "Mon Palmarès" (ou titre équivalent).              | La section est visible et contient une sous-section "Statistiques" et une sous-section "Hauts Faits".                                                                                                        |                    |       |
| 1.3   | Vérifier l'affichage des statistiques.                                 | Les statistiques du joueur (Parties Jouées, Sorts Lancés, etc.) sont affichées avec leurs valeurs correctes, correspondant aux données en base (ou aux données mockées de `useAuth` si le backend n'est pas live). |                    |       |
| 1.4   | Vérifier l'affichage des Hauts Faits débloqués.                        | Les Hauts Faits correspondant aux IDs dans `unlockedAchievements` de l'utilisateur sont affichés (icône, nom via survol ou affiché). Les informations correspondent à `achievementDefinitions.ts`.          |                    |       |
| 1.5   | (Si applicable) Vérifier l'affichage si aucune statistique n'est à zéro. | Toutes les statistiques affichent "0".                                                                                                                                                                       |                    |       |
| 1.6   | (Si applicable) Vérifier l'affichage si aucun Haut Fait n'est débloqué.  | Un message "Aucun haut fait débloqué pour le moment" (ou traduction) s'affiche dans la section des Hauts Faits.                                                                                                 |                    |       |

### Scénario 2 : Déblocage d'un Nouveau Haut Fait et Notification Toast

| Étape | Action                                                                                                                               | Résultat Attendu                                                                                                                                                                                                                            | Statut (Pass/Fail) | Notes |
| :---- | :----------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :----------------- | :---- |
| 2.1   | **Préparation :** S'assurer que l'utilisateur est proche de débloquer un Haut Fait spécifique (ex: `duelsWon` à 9 pour un HF à 10). Noter les `unlockedAchievements` actuels. | L'utilisateur a la statistique X à la valeur Y (Y < Seuil). L'ID du Haut Fait Z n'est pas dans `unlockedAchievements`.                                                                                                             |                    |       |
| 2.2   | Effectuer l'action en jeu qui incrémente la statistique au-delà du seuil (ex: gagner un duel). **OU** Modifier manuellement la stat dans Firestore. | L'action est complétée / La statistique est mise à jour dans Firestore.                                                                                                                                                                 |                    |       |
| 2.3   | Naviguer (ou rafraîchir) la Page de Profil.                                                                                            | La Page de Profil se charge.                                                                                                                                                                                                                |                    |       |
| 2.4   | Observer les notifications.                                                                                                          | Une notification Toast apparaît : "✨ Haut Fait débloqué : {Nom du Haut Fait} ! ✨" (ou traduction). Le nom correspond au Haut Fait Z.                                                                                                           |                    |       |
| 2.5   | Vérifier la section "Mon Palmarès".                                                                                                     | La statistique mise à jour (ex: `duelsWon` est maintenant à 10) s'affiche correctement. Le nouveau Haut Fait Z est maintenant visible dans la liste des Hauts Faits débloqués.                                                                 |                    |       |
| 2.6   | Recharger la Page de Profil.                                                                                                         | Aucune nouvelle notification Toast n'apparaît pour le Haut Fait Z (il a déjà été "vu"). Le Haut Fait Z reste affiché dans la liste.                                                                                                             |                    |       |

### Scénario 3 : Déblocage de Plusieurs Nouveaux Hauts Faits en Même Temps

| Étape | Action                                                                                                                                  | Résultat Attendu                                                                                                                                                                                                                            | Statut (Pass/Fail) | Notes |
| :---- | :-------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :----------------- | :---- |
| 3.1   | **Préparation :** S'assurer que l'utilisateur est proche de débloquer *plusieurs* Hauts Faits (ex: stat A -> HF_A, stat B -> HF_B). Noter les `unlockedAchievements`. | L'utilisateur n'a pas HF_A ni HF_B.                                                                                                                                                                                         |                    |       |
| 3.2   | Effectuer les actions en jeu / Modifier Firestore pour que plusieurs seuils soient atteints simultanément (avant le prochain chargement du profil). | Les statistiques sont mises à jour.                                                                                                                                                                                                     |                    |       |
| 3.3   | Naviguer (ou rafraîchir) la Page de Profil.                                                                                               | La Page de Profil se charge.                                                                                                                                                                                                                |                    |       |
| 3.4   | Observer les notifications.                                                                                                             | Plusieurs notifications Toast apparaissent (potentiellement l'une après l'autre ou en pile, selon l'implémentation du ToastContext), une pour chaque nouveau Haut Fait débloqué (HF_A, HF_B).                                              |                    |       |
| 3.5   | Vérifier la section "Mon Palmarès".                                                                                                        | Les statistiques mises à jour s'affichent. Les nouveaux Hauts Faits (HF_A, HF_B) sont visibles dans la liste.                                                                                                                                 |                    |       |

## Notes Additionnelles

*   Vérifier l'absence d'erreurs dans la console du navigateur pendant toutes les manipulations.
*   Si des icônes sont implémentées pour les statistiques ou les Hauts Faits, vérifier leur affichage correct.
*   Les traductions doivent être correctes si d'autres langues sont testées.

---

Fin de la procédure de test.
