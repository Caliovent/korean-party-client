/* eslint-disable @typescript-eslint/no-explicit-any */
// src/pages/LoginPage.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { useTranslation } from 'react-i18next';

const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

   const handleSignInOrCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. On essaie d'abord de se connecter
      await signInWithEmailAndPassword(auth, email, password);
      console.log('Utilisateur connecté avec succès.');
      navigate('/hub'); // Redirige vers le hub après connexion
    } catch (signInError: any) {
      // 2. Si la connexion échoue, on vérifie pourquoi
      if (signInError.code === 'auth/invalid-credential' || signInError.code === 'auth/user-not-found') {
        console.log("Compte inexistant, tentative de création...");
        try {
          // 3. Le compte n'existe pas, on essaie de le créer
          await createUserWithEmailAndPassword(auth, email, password);
          console.log('Nouveau compte créé et utilisateur connecté.');
          navigate('/hub'); // Redirige vers le hub après création
        } catch (createError: any) {
          console.error("Erreur lors de la création du compte :", createError);
          setError(`Erreur de création : ${createError.message}`);
        }
      } else {
        // 4. C'est une autre erreur de connexion (ex: mauvais format d'email)
        console.error("Erreur de connexion :", signInError);
        setError(signInError.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container"> {/* Added class for card styling */}
      <form onSubmit={handleSignInOrCreate}>
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