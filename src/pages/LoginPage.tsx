/* eslint-disable @typescript-eslint/no-explicit-any */
// src/pages/LoginPage.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { useTranslation } from 'react-i18next';

const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/hub');
    } catch (err: any) {
      setError(err.message);
      console.error(err);
    }
  };

  const handleSignInAnonymously = async () => {
    setError(null);
    try {
      await signInAnonymously(auth);
      navigate('/hub');
    } catch (err: any) {
      setError(err.message);
      console.error(err);
    }
  };

  return (
    <div>
      <form onSubmit={handleSignIn}>
        <h2>{t('login.email_signin_button')}</h2>
        <div>
          <label>{t('login.email_label')}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label>{t('login.password_label')}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">{t('login.email_signin_button')}</button>
      </form>
      
      <hr />
      
      <button type="button" onClick={handleSignInAnonymously}>
        {t('login.anon_signin_button')}
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default LoginPage;