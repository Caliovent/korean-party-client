import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from './LoginPage'; // Adjusted path
import { describe, it, expect, vi } from 'vitest'; // Added vi

// Simuler le module i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }) // Added type for key
}));

describe('LoginPage', () => {
  it('devrait afficher les champs email, mot de passe et le bouton de connexion', () => {
    // Rendu du composant
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    // Vérification de la présence des éléments
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('devrait permettre à l\'utilisateur de saisir du texte dans les champs', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await user.type(emailInput, 'sorcier@k-mage.com');
    await user.type(passwordInput, 'motdepassemagique');

    expect(emailInput).toHaveValue('sorcier@k-mage.com');
    expect(passwordInput).toHaveValue('motdepassemagique');
  });
});
