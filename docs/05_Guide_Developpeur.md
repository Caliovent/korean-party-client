# 5. Guide du Développeur

## 5.1. Setup de l'Environnement

1.  **Frontend (`korean-party-client`) :**
    -   Assurez-vous d'avoir Node.js et npm installés.
    -   Exécutez `npm install` à la racine du dossier.
    -   Créez un fichier `.env` (ou `.env.local` qui est prioritaire et non versionné) à la racine du projet en vous basant sur les variables d'environnement attendues par Firebase (ex: `VITE_FIREBASE_API_KEY`, etc.). Ces variables sont généralement fournies lors de la configuration de votre projet Firebase.
    -   Exécutez `npm run dev` pour lancer le serveur de développement.

2.  **Backend (Firebase Emulators) :**
    -   Assurez-vous d'avoir Firebase CLI installé (`npm install -g firebase-tools`).
    -   Connectez-vous à Firebase avec `firebase login` si ce n'est pas déjà fait.
    -   Pour le développement local, ce projet est configuré pour utiliser les **Firebase Emulators**.
    -   Lancez les émulateurs avec la commande : `firebase emulators:start`
    -   Cette commande utilisera la configuration définie dans `firebase.json` à la racine du projet. Les services principaux (Auth, Firestore, Functions) sont configurés pour utiliser les ports suivants :
        -   Auth: `localhost:9099`
        -   Firestore: `localhost:8092`
        -   Functions: `localhost:5001`
        -   Emulator UI: `localhost:4000` (par défaut)
    -   L'application frontend (quand lancée avec `npm run dev`) se connectera automatiquement à ces émulateurs.
    -   Si vous avez des Cloud Functions dans un dossier `functions` (par exemple), assurez-vous d'installer leurs dépendances (`npm install` dans le dossier `functions`) avant de lancer les émulateurs.

3.  **Déploiement du Backend (Cloud Functions) :**
    -   Pour déployer vos fonctions sur Firebase (environnement de production ou de test distant) :
        -   Naviguez vers le dossier contenant vos fonctions (ex: `functions`).
        -   Exécutez `npm install` si nécessaire.
        -   Utilisez `firebase deploy --only functions` pour déployer les fonctions.

## 5.2. Principes Architecturaux Clés

-   **Serveur Autoritaire :** Aucune logique de jeu ne doit être implémentée côté client. Le client envoie des intentions (`je veux faire X`), le serveur les valide et les exécute.
-   **"Écouter, Afficher, Demander" :** Le frontend doit être réactif. Il s'abonne à l'état du jeu dans Firestore (`onSnapshot`) et met à jour l'affichage en conséquence. Il ne modifie jamais son propre état directement.
-   **Services :** Toute communication avec le backend (appels aux Cloud Functions) doit passer par des fonctions dédiées dans le dossier `src/services/`.

## 5.3. Processus de Travail

Pour toute nouvelle fonctionnalité majeure, nous suivons un processus en 3 étapes :
1.  **Analyse et Proposition :** L'agent IA analyse la demande et propose une architecture ou un plan d'implémentation détaillé.
2.  **Validation :** Le Lead Developer (humain) valide la proposition.
3.  **Implémentation :** L'agent IA développe la fonctionnalité en suivant le plan validé.