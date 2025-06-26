import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { Quest } from '../types/game';
import { useTranslation } from 'react-i18next';
import { subscribeToActiveQuests, subscribeToCompletedQuests } from '../services/questService';

type QuestLogView = 'active' | 'completed';

const QuestLog: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const [activeQuests, setActiveQuests] = useState<Quest[]>([]);
  const [completedQuests, setCompletedQuests] = useState<Quest[]>([]);
  const [loadingActiveQuests, setLoadingActiveQuests] = useState<boolean>(true);
  const [loadingCompletedQuests, setLoadingCompletedQuests] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<QuestLogView>('active');

  useEffect(() => {
    if (!user) {
      setLoadingActiveQuests(false);
      setLoadingCompletedQuests(false);
      setActiveQuests([]);
      setCompletedQuests([]);
      return;
    }

    setError(null);
    setLoadingActiveQuests(true);
    setLoadingCompletedQuests(true);

    const handleActiveQuestsUpdate = (quests: Quest[]) => {
      setActiveQuests(quests);
      setLoadingActiveQuests(false);
    };

    const handleCompletedQuestsUpdate = (quests: Quest[]) => {
      setCompletedQuests(quests);
      setLoadingCompletedQuests(false);
    };

    const handleError = (type: 'active' | 'completed', err: Error) => {
      console.error(`Erreur de chargement des quêtes (${type}):`, err);
      const errorKey = type === 'active' ? 'quests_load_error_active' : 'quests_load_error_completed';
      setError(prevError => {
        const newErrorMessage = t(errorKey);
        return prevError ? prevError + " " + newErrorMessage : newErrorMessage;
      });
      if (type === 'active') setLoadingActiveQuests(false);
      if (type === 'completed') setLoadingCompletedQuests(false);
    };

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
  }, [user, t]);

  const isLoading = authLoading || loadingActiveQuests || loadingCompletedQuests;

  if (isLoading) {
    return <p>{t('loading_quests_message') || "Chargement du journal de quêtes..."}</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>{error}</p>;
  }

  if (!user) {
    return <p>{t('quests_not_logged_in') || "Veuillez vous connecter pour voir vos quêtes."}</p>;
  }

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
          {activeQuests.length === 0 ? (
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
          {completedQuests.length === 0 ? (
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
