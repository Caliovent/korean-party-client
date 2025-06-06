// src/pages/HomePage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const HomePage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('welcomeMessage')}</h1>
      <p>{t('homePageDescription')}</p>
      <nav>
        <Link to="/login">{t('goToLoginPage')}</Link>
      </nav>
    </div>
  );
};

export default HomePage;
