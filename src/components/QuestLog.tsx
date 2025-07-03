import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useContent } from '../contexts/ContentContext'; // Import useContent
import type { Quest } from '../types/game';
import { useTranslation } from 'react-i18next';
import { subscribeToActiveQuests, subscribeToCompletedQuests } from '../services/questService';

type QuestLogView = 'active' | 'completed';

const QuestLog: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { gameData, isLoading: contentLoading, error: contentError } = useContent(); // Use content context
  const { t } = useTranslation();

  const [activeQuests, setActiveQuests] = useState<Quest[]>([]);
  const [completedQuests, setCompletedQuests] = useState<Quest[]>([]);
  const [loadingUserQuests, setLoadingUserQuests] = useState<boolean>(true); // More specific loading state
  const [questServiceError, setQuestServiceError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<QuestLogView>('active');

  useEffect(() => {
    if (!user || contentLoading) { // Don't fetch user quests if user isn't loaded or content is still loading
      setLoadingUserQuests(false); // Or true if we want to wait for content
      setActiveQuests([]);
      setCompletedQuests([]);
      return;
    }

    // At this point, user is available and initial content (like quest definitions) should be loaded or loading.
    // We can proceed to load user-specific quest progress.

    setQuestServiceError(null);
    setLoadingUserQuests(true); // Start loading user-specific quests

    const handleActiveQuestsUpdate = (quests: Quest[]) => {
      setActiveQuests(quests);
      // No need to check gameData.questDefinitions here if titleKey/descriptionKey are self-sufficient
      setLoadingUserQuests(prevLoading => currentView === 'active' ? false : prevLoading);
    };

    const handleCompletedQuestsUpdate = (quests: Quest[]) => {
      setCompletedQuests(quests);
      setLoadingUserQuests(prevLoading => currentView === 'completed' ? false : prevLoading);
    };

    const handleError = (type: 'active' | 'completed', err: Error) => {
      console.error(`Erreur de chargement des quêtes utilisateur (${type}):`, err);
      const errorKey = type === 'active' ? 'quests_load_error_active' : 'quests_load_error_completed';
      setQuestServiceError(prevError => {
        const newErrorMessage = t(errorKey);
        return prevError ? prevError + " " + newErrorMessage : newErrorMessage;
      });
      setLoadingUserQuests(false); // Stop loading on error for both
    };

    // Reset loading state when view changes, so it can be set by the correct subscription
    setLoadingUserQuests(true);

    const unsubscribeActive = subscribeToActiveQuests(
      user.uid,
      handleActiveQuestsUpdate,
      (err) => handleError('active', err)
    );

    const unsubscribeCompleted = subscribeToCompletedQuests(
      user.uid,
      handleCompletedQuestsUpdate,
      (err) => handleError('completed', err)
    );

    return () => {
      unsubscribeActive();
      unsubscribeCompleted();
    };
  }, [user, contentLoading, gameData, t, currentView]); // Added currentView to re-evaluate loading state on tab change

  // Combined loading state
  const isLoading = authLoading || contentLoading || loadingUserQuests;

  if (isLoading) {
    return <p>{t('loading_quests_message') || "Chargement du journal de quêtes..."}</p>;
  }

  if (contentError) {
    return <p style={{ color: 'red' }}>{t('quests_content_error_message') || "Erreur de chargement des définitions de quêtes."} ({contentError.message})</p>;
  }

  if (questServiceError) {
    return <p style={{ color: 'red' }}>{questServiceError}</p>;
  }

  if (!user) {
    return <p>{t('quests_not_logged_in') || "Veuillez vous connecter pour voir vos quêtes."}</p>;
  }

  // Optional: Check if gameData.questDefinitions is available if you plan to use it directly
  // For now, we assume titleKey and descriptionKey from questService are sufficient.
  // if (!gameData || !gameData.questDefinitions) {
  //   return <p>{t('loading_quests_definitions_message') || "Chargement des définitions de quêtes..."}</p>;
  // }


  return (
    <div className="quest-log">
      <div className="quest-log-tabs">
        <button
          onClick={() => setCurrentView('active')}
          className={currentView === 'active' ? 'active-tab' : ''}
          aria-current={currentView === 'active' ? 'page' : undefined}
        >
          {t('quests_active_tab_label') || "Actives"}
        </button>
        <button
          onClick={() => setCurrentView('completed')}
          className={currentView === 'completed' ? 'active-tab' : ''}
          aria-current={currentView === 'completed' ? 'page' : undefined}
        >
          {t('quests_completed_tab_label') || "Terminées"}
        </button>
      </div>

      {currentView === 'active' && (
        <section aria-labelledby="active-quests-heading">
          <h2 id="active-quests-heading">{t('active_quests_title') || "Quêtes Actives"}</h2>
          {activeQuests.length === 0 && !loadingUserQuests ? ( // Ensure not loading before showing "no quests"
            <p>{t('no_active_quests') || "Aucune quête active pour le moment."}</p>
          ) : (
            <ul>
              {activeQuests.map(quest => (
                <li key={quest.id}>
                  <h3>{t(quest.titleKey) || quest.titleKey}</h3>
                  {/* <p>{t(quest.descriptionKey) || quest.descriptionKey}</p> */}
                  <p>
                    {t('quest_progress_label') || "Progrès"} : {quest.progress} / {quest.target}
                  </p>
                  {/* TODO: Barre de progression visuelle */}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {currentView === 'completed' && (
        <section aria-labelledby="completed-quests-heading">
          <h2 id="completed-quests-heading">{t('completed_quests_title') || "Quêtes Terminées"}</h2>
          {completedQuests.length === 0 && !loadingUserQuests ? ( // Ensure not loading before showing "no quests"
            <p>{t('no_completed_quests') || "Aucune quête terminée pour le moment."}</p>
          ) : (
            <ul>
              {completedQuests.map(quest => (
                <li key={quest.id} style={{ opacity: 0.7, fontStyle: 'italic' }}> {/* Style pour quêtes terminées */}
                  <h3>{t(quest.titleKey) || quest.titleKey} ✅</h3>
                  {/* <p>{t(quest.descriptionKey) || quest.descriptionKey}</p> */}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
};

export default QuestLog;
