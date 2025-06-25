import { collection, query, onSnapshot, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Quest } from '../types/game';

type QuestSubscriptionCallback = (quests: Quest[]) => void;
type ErrorCallback = (error: Error) => void;

export const subscribeToActiveQuests = (
  userId: string,
  onUpdate: QuestSubscriptionCallback,
  onError: ErrorCallback
): (() => void) => {
  const activeQuestsRef = collection(db, `playerQuests/${userId}/activeQuests`);
  const q = query(activeQuestsRef); // Peut être ordonné ou filtré davantage si nécessaire

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const quests: Quest[] = [];
    snapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
      quests.push({ id: doc.id, ...doc.data() } as Quest);
    });
    onUpdate(quests);
  }, (err) => {
    console.error("Erreur de chargement des quêtes actives:", err);
    onError(err);
  });

  return unsubscribe;
};

export const subscribeToCompletedQuests = (
  userId: string,
  onUpdate: QuestSubscriptionCallback,
  onError: ErrorCallback
): (() => void) => {
  const completedQuestsRef = collection(db, `playerQuests/${userId}/completedQuests`);
  const q = query(completedQuestsRef);

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const quests: Quest[] = [];
    snapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
      quests.push({ id: doc.id, ...doc.data() } as Quest);
    });
    onUpdate(quests);
  }, (err) => {
    console.error("Erreur de chargement des quêtes terminées:", err);
    onError(err);
  });

  return unsubscribe;
};
