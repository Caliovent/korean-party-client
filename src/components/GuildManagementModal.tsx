import React, { useEffect, useState, useCallback } from 'react';
import { getGuilds, createGuild } from '../services/gameService';
import type { Guild } from '../types/guild';
import { useAuth } from '../hooks/useAuth'; // Import the useAuth hook

interface GuildManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GuildManagementModal: React.FC<GuildManagementModalProps> = ({ isOpen, onClose }) => {
  const { user, updateUserGuildId } = useAuth(); // Get user data from useAuth
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loadingGuilds, setLoadingGuilds] = useState<boolean>(true);
  const [guildsError, setGuildsError] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [guildName, setGuildName] = useState<string>('');
  const [guildTag, setGuildTag] = useState<string>('');
  const [creatingGuild, setCreatingGuild] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccessMessage, setCreateSuccessMessage] = useState<string | null>(null);

  const fetchGuildsList = useCallback(async () => {
    try {
      setLoadingGuilds(true);
      const fetchedGuilds = await getGuilds();
      setGuilds(fetchedGuilds);
      setGuildsError(null);
    } catch (err) {
      console.error("Error fetching guilds in component:", err);
      setGuildsError('Failed to fetch guilds.');
      setGuilds([]);
    } finally {
      setLoadingGuilds(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchGuildsList();
      // Reset create form state when modal opens
      setShowCreateForm(false);
      setCreateError(null);
      setCreateSuccessMessage(null);
      setGuildName('');
      setGuildTag('');
    }
  }, [isOpen, fetchGuildsList]);

  const handleCreateGuild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guildName.trim() || !guildTag.trim()) {
      setCreateError("Name and Tag cannot be empty.");
      return;
    }
    setCreatingGuild(true);
    setCreateError(null);
    setCreateSuccessMessage(null);
    try {
      // Ensure user is available and doesn't have a guildId before creating
      if (user && !user.guildId) {
        await createGuild(guildName, guildTag);
        setCreateSuccessMessage('Maison créée avec succès !');
        setShowCreateForm(false);
        setGuildName('');
        setGuildTag('');
        fetchGuildsList(); // Refresh guild list
        // Simulate updating user's guildId locally.
        // In a real app, this might come from the backend response or a token refresh.
        updateUserGuildId(`new-guild-id-${Date.now()}`); // Placeholder new guild ID
      } else {
        setCreateError("User already in a guild or user data not loaded.");
      }
    } catch (err: any) {
      console.error("Error creating guild:", err);
      setCreateError(err.message || 'Erreur lors de la création.');
    } finally {
      setCreatingGuild(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', width: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2>Guild Management</h2>

        {/* Guild Creation Section */}
        {user && !user.guildId && !showCreateForm && (
          <button onClick={() => { setShowCreateForm(true); setCreateError(null); setCreateSuccessMessage(null); }} style={{ marginBottom: '15px' }}>
            Créer une Maison
          </button>
        )}

        {showCreateForm && (
          <form onSubmit={handleCreateGuild} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #eee', borderRadius: '5px' }}>
            <h3>Créer une nouvelle Maison</h3>
            <div>
              <label htmlFor="guildName">Nom de la Maison:</label>
              <input
                id="guildName"
                type="text"
                value={guildName}
                onChange={(e) => setGuildName(e.target.value)}
                disabled={creatingGuild}
                style={{ width: '100%', padding: '8px', marginBottom: '10px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label htmlFor="guildTag">Tag de la Maison (3-5 chars):</label>
              <input
                id="guildTag"
                type="text"
                value={guildTag}
                onChange={(e) => setGuildTag(e.target.value)}
                disabled={creatingGuild}
                minLength={3}
                maxLength={5}
                style={{ width: '100%', padding: '8px', marginBottom: '10px', boxSizing: 'border-box' }}
              />
            </div>
            <button type="submit" disabled={creatingGuild} style={{ marginRight: '10px' }}>
              {creatingGuild ? 'Création en cours...' : 'Soumettre la création'}
            </button>
            <button type="button" onClick={() => setShowCreateForm(false)} disabled={creatingGuild}>
              Annuler
            </button>
            {createError && <p style={{ color: 'red', marginTop: '10px' }}>{createError}</p>}
          </form>
        )}
        {createSuccessMessage && <p style={{ color: 'green' }}>{createSuccessMessage}</p>}


        {/* Guild List Section */}
        <h3>Liste des Maisons</h3>
        {loadingGuilds && <p>Loading guilds...</p>}
        {guildsError && <p style={{ color: 'red' }}>{guildsError}</p>}
        {!loadingGuilds && !guildsError && (
          guilds.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Name</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Tag</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Members</th>
                </tr>
              </thead>
              <tbody>
                {guilds.map((guild) => (
                  <tr key={guild.id}>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{guild.name}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{guild.tag}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{guild.members.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>Aucune maison n'est actuellement disponible.</p>
          )
        )}
        <button onClick={onClose} style={{ marginTop: '20px' }}>Close</button>
      </div>
    </div>
  );
};

export default GuildManagementModal;
