/* eslint-disable @typescript-eslint/no-explicit-any */
// src/pages/LoginPage.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
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

  return (
    <div className="login-container"> {/* Added class for card styling */}
      <form onSubmit={handleSignIn}>
        <h2>{t('login.title')}</h2>
        <div className="form-group"> {/* Added class for form styling */}
          <label htmlFor="email">{t('login.email_label')}</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group"> {/* Added class for form styling */}
          <label htmlFor="password">{t('login.password_label')}</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <p className="form-helper-text">{t('login.form_helper_text')}</p> {/* Added helper text */}
        {/* Buttons will pick up global styles from App.css which are now variable-based */}
        <div className="form-actions"> {/* Optional: wrap button for layout if needed, or style directly */}
          <button type="submit">{t('login.title')}</button>
        </div>
      </form>
      
      <hr style={{ margin: 'var(--spacing-unit) * 4 0' }} /> {/* Added margin to hr */}
      
      {error && <p className="error-message">{error}</p>} {/* Used class for error message */}
    </div>
  );
};

export default LoginPage;