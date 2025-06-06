// src/pages/LoginPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('loginPageTitle')}</h1>
      <p>{t('loginPageDescription')}</p>
      <nav>
        <Link to="/">{t('goToHomePage')}</Link>
      </nav>
    </div>
  );
};

export default LoginPage;
