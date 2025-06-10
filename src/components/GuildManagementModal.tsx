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
        return <p>Loading your guild details...</p>;
      }
      if (guildDetailsError) {
        return <p style={{ color: 'red' }}>Error: {guildDetailsError}</p>;
      }
      if (currentGuildDetails) {
        return (
          <div style={{ textAlign: 'left' }}>
            <h3>{currentGuildDetails.name} [{currentGuildDetails.tag}]</h3>
            <h4>Membres ({currentGuildDetails.members.length}):</h4>
            {currentGuildDetails.members && currentGuildDetails.members.length > 0 ? (
              <ul style={{ listStyleType: 'none', paddingLeft: '10px' }}>
                {currentGuildDetails.members.map((member, index) => (
                  // Assuming member is a string (user ID or name). If it's an object, adjust accordingly.
                  <li key={index}>{typeof member === 'string' ? member : JSON.stringify(member)}</li>
                ))}
              </ul>
            ) : (
              <p>Cette maison n'a pas encore de membres.</p>
            )}
            <button
              onClick={handleLeaveGuild}
              disabled={isLeavingGuild}
              style={{ marginTop: '15px', backgroundColor: 'red', color: 'white' }}
            >
              {isLeavingGuild ? 'Départ en cours...' : 'Quitter la Maison'}
            </button>
            {leaveGuildError && <p style={{ color: 'red', marginTop: '10px' }}>{leaveGuildError}</p>}
            {/* leaveGuildSuccessMessage is handled by the view changing */}
          </div>
        );
      }
      // If joinSuccessMessage is present, it means we just joined, and details might still be loading.
      if (joinSuccessMessage && !isLoadingGuildDetails && !guildDetailsError) {
         // This case might occur if guild details fetch was too fast and returned null right after joining.
         // Or if the user joined a guild that was immediately disbanded.
         return (
            <div>
                <p style={{ color: 'green' }}>{joinSuccessMessage}</p>
                <p>Les détails de votre maison sont en cours de chargement ou un problème est survenu.</p>
            </div>
         );
      }
      // Fallback if currentGuildDetails is null for other reasons after loading and no error.
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
             style={{ marginBottom: '15px' }}
           >
             Créer une Maison
           </button>
        )}

        {/* Guild Creation Form */}
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
        {createSuccessMessage && <p style={{ color: 'green', marginBottom: '15px' }}>{createSuccessMessage}</p>}
        {joinError && <p style={{ color: 'red', marginBottom: '15px' }}>{joinError}</p>}
        {leaveGuildSuccessMessage && <p style={{ color: 'green', marginBottom: '15px' }}>{leaveGuildSuccessMessage}</p>}
        {/* Join success message is handled inside renderContent when user has a guildId */}

        {/* Guild List Section - only if not showing create form and no guild */}
        {!showCreateForm && (
          <>
            <h3>Liste des Maisons</h3>
            {loadingGuilds && <p>Loading guilds...</p>}
            {guildsError && <p style={{ color: 'red' }}>{guildsError}</p>}
            {!loadingGuilds && !guildsError && guilds.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Name</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Tag</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Members</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {guilds.map((guild) => (
                    <tr key={guild.id}>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{guild.name}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{guild.tag}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{guild.members.length}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                        <button
                          onClick={() => handleJoinGuild(guild.id, guild.name)}
                          disabled={joiningGuildId === guild.id || !!(user && user.guildId)}
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
          </>
        )}
      </>
    );
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', width: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2>Guild Management</h2>
        {renderContent()}
        <button onClick={onClose} style={{ marginTop: '20px' }}>Close</button>
      </div>
    </div>
  );
};

export default GuildManagementModal;
