// src/pages/HomePage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useToasts } from '../contexts/ToastContext'; // Import useToasts

const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const { addToast } = useToasts(); // Use the hook

  return (
    <div style={{textAlign: 'center', padding: 'var(--spacing-unit) * 4'}}> {/* Added padding */}
      <h1>{t('welcomeMessage')}</h1>
      <p>{t('homePageDescription')}</p>
      
      <div style={{marginTop: 'calc(var(--spacing-unit) * 4)'}}> {/* Use var for margin */}
        <Link to="/lobby">
          {/* This button will inherit global styles from App.css */}
          <button>{t('goToLobby', 'Aller au Salon')}</button>
        </Link>
      </div>

      {/* Test Toast Buttons */}
      <div style={{marginTop: 'calc(var(--spacing-unit) * 4)', display: 'flex', justifyContent: 'center', gap: 'var(--spacing-unit)'}}>
        <button onClick={() => addToast("Test Info Toast!", "info")}>
          Show Info Toast
        </button>
        <button onClick={() => addToast("Test Success Toast!", "success", 3000)}>
          Show Success Toast (3s)
        </button>
        <button onClick={() => addToast("Test Error Toast!", "error", 10000)}>
          Show Error Toast (10s)
        </button>
        <button onClick={() => addToast("Test Warning Toast! This is a longer message to see how it wraps and handles content.", "warning", 0)}>
          Show Warning Toast (no auto-dismiss)
        </button>
      </div>
    </div>
  );
};

export default HomePage;
