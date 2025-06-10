import React, { useEffect, useState, useCallback } from 'react';
import { getGuilds, createGuild, joinGuild, getGuildById, leaveGuild } from '../services/gameService'; // Import leaveGuild
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

  const [joiningGuildId, setJoiningGuildId] = useState<string | null>(null); // State for loading indicator on specific button
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccessMessage, setJoinSuccessMessage] = useState<string | null>(null);

  // State for current guild details
  const [currentGuildDetails, setCurrentGuildDetails] = useState<Guild | null>(null);
  const [isLoadingGuildDetails, setIsLoadingGuildDetails] = useState<boolean>(false);
  const [guildDetailsError, setGuildDetailsError] = useState<string | null>(null);

  // State for leaving guild operation
  const [isLeavingGuild, setIsLeavingGuild] = useState<boolean>(false);
  const [leaveGuildError, setLeaveGuildError] = useState<string | null>(null);
  const [leaveGuildSuccessMessage, setLeaveGuildSuccessMessage] = useState<string | null>(null);

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
      setCreateSuccessMessage(null); // Clear create success message
      setGuildName('');
      setGuildTag('');
      // Reset join state as well
      setJoinError(null);
      setJoinSuccessMessage(null); // Clear join success message
      setJoiningGuildId(null);
      // Reset current guild details state
      setCurrentGuildDetails(null);
      setGuildDetailsError(null);
      setIsLoadingGuildDetails(false);
      // Reset leave guild state
      setLeaveGuildError(null);
      setLeaveGuildSuccessMessage(null);
      setIsLeavingGuild(false);
    }
  }, [isOpen, fetchGuildsList]);

  // Effect to fetch current guild details if user has a guildId
  useEffect(() => {
    const fetchCurrentGuild = async () => {
      if (user && user.guildId && isOpen) { // Also check isOpen to avoid fetching when modal is closed
        setIsLoadingGuildDetails(true);
        setGuildDetailsError(null);
        // Clear join success message when we are about to show guild details
        // as it's part of the same "user is in a guild" view.
        setJoinSuccessMessage(null);
        try {
          const details = await getGuildById(user.guildId);
          setCurrentGuildDetails(details);
          if (!details) {
            setGuildDetailsError("Could not fetch your guild's details. It may have been disbanded.");
            // Potentially call updateUserGuildId(null) if the guild doesn't exist,
            // though this could also be a backend responsibility (e.g. on user login).
          }
        } catch (err) {
          console.error("Error fetching current guild details:", err);
          setGuildDetailsError("Failed to fetch your guild's details.");
        } finally {
          setIsLoadingGuildDetails(false);
        }
      } else if (!user?.guildId) {
        // Clear details if user somehow loses guildId (e.g. after leaving)
        setCurrentGuildDetails(null);
      }
    };

    fetchCurrentGuild();
  }, [user, user?.guildId, isOpen]); // Depend on user object and specifically guildId and isOpen

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

  const handleJoinGuild = async (guildId: string, guildName: string) => {
    setJoiningGuildId(guildId);
    setJoinError(null);
    setJoinSuccessMessage(null);
    setCreateSuccessMessage(null); // Clear create success message
    setCreateError(null); // Clear create error
    try {
      if (user && !user.guildId) {
        await joinGuild(guildId);
        updateUserGuildId(guildId); // Update user's guildId in local auth state
        setJoinSuccessMessage(`Vous avez rejoint la maison ${guildName} !`);
        // No need to call fetchGuildsList() here if the view changes entirely
        // or if the buttons to join/create disappear.
        // If the list remains visible and should update (e.g. member count), then fetch.
      } else {
        setJoinError("You are already in a guild or user data is not available.");
      }
    } catch (err: any) {
      console.error("Error joining guild:", err);
      setJoinError(err.message || "Impossible de rejoindre cette maison.");
    } finally {
      setJoiningGuildId(null);
    }
  };

  const handleLeaveGuild = async () => {
    if (!user || !user.guildId) {
      setLeaveGuildError("Vous n'êtes pas membre d'une maison ou votre session a expiré.");
      return;
    }
    setIsLeavingGuild(true);
    setLeaveGuildError(null);
    setLeaveGuildSuccessMessage(null);
    // Clear other messages
    setCreateError(null);
    setCreateSuccessMessage(null);
    setJoinError(null);
    setJoinSuccessMessage(null);

    try {
      await leaveGuild(); // Call the service function
      updateUserGuildId(null); // Update auth state
      setLeaveGuildSuccessMessage("Vous avez quitté la maison.");
      setCurrentGuildDetails(null); // Clear current guild details
      // The modal will re-render due to user.guildId change, showing join/create options.
      // Fetch the list of guilds again for the updated view.
      fetchGuildsList();
    } catch (err: any) {
      console.error("Error leaving guild:", err);
      setLeaveGuildError(err.message || "Erreur en quittant la maison.");
    } finally {
      setIsLeavingGuild(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  // Determine content based on user's guild status
  const renderContent = () => {
    if (user && user.guildId) {
      // User is in a guild - Show guild details or management options
      if (isLoadingGuildDetails) {
        return <p>Loading your guild details...</p>; // TODO: Style with a loading indicator class
      }
      if (guildDetailsError) {
        return <p className="error-message">Error: {guildDetailsError}</p>;
      }
      if (currentGuildDetails) {
        return (
          <div className="guild-details-container"> {/* Use a class for styling this section */}
            <h3>{currentGuildDetails.name} [{currentGuildDetails.tag}]</h3>
            <h4>Membres ({currentGuildDetails.members.length}):</h4>
            {currentGuildDetails.members && currentGuildDetails.members.length > 0 ? (
              <ul className="guild-member-list"> {/* Class for member list */}
                {currentGuildDetails.members.map((member, index) => (
                  <li key={index}>{typeof member === 'string' ? member : JSON.stringify(member)}</li>
                ))}
              </ul>
            ) : (
              <p>Cette maison n'a pas encore de membres.</p>
            )}
            <button
              onClick={handleLeaveGuild}
              disabled={isLeavingGuild}
              className="button-base delete-button" // Using base and error/delete button styles
              style={{ marginTop: 'calc(var(--spacing-unit) * 3)' }}
            >
              {isLeavingGuild ? 'Départ en cours...' : 'Quitter la Maison'}
            </button>
            {leaveGuildError && <p className="error-message" style={{ marginTop: 'calc(var(--spacing-unit) * 2)' }}>{leaveGuildError}</p>}
          </div>
        );
      }
      if (joinSuccessMessage && !isLoadingGuildDetails && !guildDetailsError) {
         return (
            <div>
                <p className="success-message">{joinSuccessMessage}</p> {/* Use success class */}
                <p>Les détails de votre maison sont en cours de chargement ou un problème est survenu.</p>
            </div>
         );
      }
      return <p>Vous êtes membre d'une maison, mais ses détails n'ont pu être chargés. Elle a peut-être été dissoute.</p>;
    }

    // User is NOT in a guild - Show options to create or join
    return (
      <>
        {/* Guild Creation Button - only if not showing form and no guild */}
        {!showCreateForm && (
           <button
             onClick={() => {
               setShowCreateForm(true);
               setCreateError(null);
               setCreateSuccessMessage(null);
               setJoinError(null);
               setJoinSuccessMessage(null);
             }}
             className="button-base" // Use base button style
             style={{ marginBottom: 'calc(var(--spacing-unit) * 3)' }}
           >
             Créer une Maison
           </button>
        )}

        {/* Guild Creation Form */}
        {showCreateForm && (
          // Apply form-container styling if available, or style inline with variables
          <form onSubmit={handleCreateGuild} className="guild-create-form" style={{ marginBottom: 'calc(var(--spacing-unit) * 4)', padding: 'calc(var(--spacing-unit) * 3)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)' }}>
            <h3>Créer une nouvelle Maison</h3>
            <div className="form-group">
              <label htmlFor="guildName">Nom de la Maison:</label>
              <input
                id="guildName"
                type="text"
                value={guildName}
                onChange={(e) => setGuildName(e.target.value)}
                disabled={creatingGuild}
                // Inputs will inherit styles from .form-group input in App.css or global input styles
              />
            </div>
            <div className="form-group">
              <label htmlFor="guildTag">Tag de la Maison (3-5 chars):</label>
              <input
                id="guildTag"
                type="text"
                value={guildTag}
                onChange={(e) => setGuildTag(e.target.value)}
                disabled={creatingGuild}
                minLength={3}
                maxLength={5}
              />
            </div>
            <div className="form-actions"> {/* Wrapper for buttons */}
              <button type="submit" disabled={creatingGuild} className="button-base">
                {creatingGuild ? 'Création en cours...' : 'Soumettre la création'}
              </button>
              <button type="button" onClick={() => setShowCreateForm(false)} disabled={creatingGuild} className="button-base button-secondary">
                Annuler
              </button>
            </div>
            {createError && <p className="error-message" style={{ marginTop: 'calc(var(--spacing-unit) * 2)' }}>{createError}</p>}
          </form>
        )}
        {createSuccessMessage && <p className="success-message" style={{ marginBottom: 'calc(var(--spacing-unit) * 3)' }}>{createSuccessMessage}</p>}
        {joinError && <p className="error-message" style={{ marginBottom: 'calc(var(--spacing-unit) * 3)' }}>{joinError}</p>}
        {leaveGuildSuccessMessage && <p className="success-message" style={{ marginBottom: 'calc(var(--spacing-unit) * 3)' }}>{leaveGuildSuccessMessage}</p>}

        {!showCreateForm && (
          <div className="guild-list-container"> {/* Class for styling this section */}
            <h3>Liste des Maisons</h3>
            {loadingGuilds && <p>Loading guilds...</p>}
            {guildsError && <p className="error-message">{guildsError}</p>}
            {!loadingGuilds && !guildsError && guilds.length > 0 && (
              <table className="styled-table" style={{ width: '100%'}}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Tag</th>
                    <th>Members</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {guilds.map((guild) => (
                    <tr key={guild.id}>
                      <td>{guild.name}</td>
                      <td>{guild.tag}</td>
                      <td>{guild.members.length}</td>
                      <td>
                        <button
                          onClick={() => handleJoinGuild(guild.id, guild.name)}
                          disabled={joiningGuildId === guild.id || !!(user && user.guildId)}
                          className="button-base" // Use base button style
                        >
                          {joiningGuildId === guild.id ? 'Joining...' : 'Rejoindre'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!loadingGuilds && !guildsError && guilds.length === 0 && (
              <p>Aucune maison n'est actuellement disponible pour rejoindre.</p>
            )}
          </div>
        )}
      </>
    );
  };

  return (
    // Use .modal-overlay and .modal-content classes similar to GameLobbyModal.css
    <div className="modal-overlay">
      <div className="modal-content" style={{width: '600px'}}> {/* Added width here, can be a specific class if needed */}
        <h2>Guild Management</h2>
        {renderContent()}
        <button onClick={onClose} className="button-base button-secondary" style={{ marginTop: 'calc(var(--spacing-unit) * 4)' }}>Close</button>
      </div>
    </div>
  );
};

export default GuildManagementModal;
