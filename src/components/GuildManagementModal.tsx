import React, { useEffect, useState, useCallback } from 'react';
import { getGuilds, createGuild, joinGuild, getGuildById, leaveGuild } from '../services/gameService';
import type { Guild, ListedGuild, CreateGuildData, GuildMember } from '../types/guild'; // Updated imports
import { useAuth } from '../hooks/useAuth';

interface GuildManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ActiveTab = 'join' | 'create'; // For the "Sans Guilde" view

const GuildManagementModal: React.FC<GuildManagementModalProps> = ({ isOpen, onClose }) => {
  const { user, updateUserGuildId } = useAuth();
  const [listedGuilds, setListedGuilds] = useState<ListedGuild[]>([]); // Use ListedGuild for the list
  const [loadingGuilds, setLoadingGuilds] = useState<boolean>(true);
  const [guildsError, setGuildsError] = useState<string | null>(null);

  // Tab state for "Sans Guilde" view
  const [activeTab, setActiveTab] = useState<ActiveTab>('join');

  // Create Guild Form States
  const [guildName, setGuildName] = useState<string>('');
  const [guildTag, setGuildTag] = useState<string>('');
  const [guildDescription, setGuildDescription] = useState<string>(''); // New field
  const [guildEmblem, setGuildEmblem] = useState<string>('');         // New field (URL or ID)
  const [creatingGuild, setCreatingGuild] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccessMessage, setCreateSuccessMessage] = useState<string | null>(null);

  const [joiningGuildId, setJoiningGuildId] = useState<string | null>(null);
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
      const fetchedGuilds = await getGuilds(); // Should return ListedGuild[]
      setListedGuilds(fetchedGuilds);
      setGuildsError(null);
    } catch (err) {
      console.error("Error fetching guilds in component:", err);
      setGuildsError('Failed to fetch guilds.');
      setListedGuilds([]);
    } finally {
      setLoadingGuilds(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Reset states when modal opens
      setGuildName('');
      setGuildTag('');
      setGuildDescription('');
      setGuildEmblem('');
      setCreateError(null);
      setCreateSuccessMessage(null);
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
    if (!guildName.trim() || !guildTag.trim() || !guildDescription.trim()) { // Added description check
      setCreateError("Name, Tag, and Description cannot be empty.");
      return;
    }
    // Basic validation for emblem (e.g., if it's a URL) - can be expanded
    if (!guildEmblem.trim()) {
        setCreateError("Emblem cannot be empty.");
        return;
    }

    setCreatingGuild(true);
    setCreateError(null);
    setCreateSuccessMessage(null);

    const guildData: CreateGuildData = {
      name: guildName,
      tag: guildTag,
      description: guildDescription,
      emblem: guildEmblem,
    };

    try {
      if (user && !user.guildId) {
        // In a real scenario, createGuild would return the new guild's ID or full object.
        // For now, we'll assume it returns something like { id: newGuildId } or just succeeds.
        const result = await createGuild(guildData); // Pass full guildData
        setCreateSuccessMessage('Maison créée avec succès !');

        // Reset form and switch to join tab or refresh current guild view
        setGuildName('');
        setGuildTag('');
        setGuildDescription('');
        setGuildEmblem('');
        setActiveTab('join'); // Switch to join tab after creation

        // This is a placeholder. The actual new guild ID would come from the backend.
        // The backend would also set the user's guildId.
        // For frontend-only, we simulate this.
        const newGuildId = result?.id || `mockGuild_${Date.now()}`; // Adjust if createGuild mock returns id
        updateUserGuildId(newGuildId);
        // Current guild details will be fetched by the useEffect watching user.guildId
        // No need to call fetchGuildsList() immediately if view changes to current guild
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

  const handleJoinGuild = async (guildId: string, guildNameDisplayed: string) => { // Renamed guildName to guildNameDisplayed
    setJoiningGuildId(guildId);
    setJoinError(null);
    setJoinSuccessMessage(null);
    setCreateSuccessMessage(null); // Clear create success message
    setCreateError(null); // Clear create error
    try {
      if (user && !user.guildId) {
        await joinGuild(guildId);
        updateUserGuildId(guildId);
        setJoinSuccessMessage(`Vous avez rejoint la maison ${guildNameDisplayed} !`);
        // Current guild details will be fetched by the useEffect watching user.guildId
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
    setCreateError(null);
    setCreateSuccessMessage(null);
    setJoinError(null);
    setJoinSuccessMessage(null);

    try {
      await leaveGuild();
      updateUserGuildId(null);
      setLeaveGuildSuccessMessage("Vous avez quitté la maison.");
      setCurrentGuildDetails(null);
      setActiveTab('join'); // Go back to join tab after leaving
      fetchGuildsList(); // Refresh list for the "join" view
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

  const renderTabs = () => (
    <div className="tabs-container" style={{ marginBottom: '20px', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
      <button
        onClick={() => setActiveTab('join')}
        className={`tab-button ${activeTab === 'join' ? 'active' : ''}`}
        disabled={!!(user && user.guildId)} // Disable if in a guild
      >
        Rejoindre une Maison
      </button>
      <button
        onClick={() => setActiveTab('create')}
        className={`tab-button ${activeTab === 'create' ? 'active' : ''}`}
        disabled={!!(user && user.guildId)} // Disable if in a guild
      >
        Créer une Maison
      </button>
    </div>
  );

  const renderCreateGuildForm = () => (
    <form onSubmit={handleCreateGuild} className="guild-create-form" style={{ padding: 'var(--spacing-unit)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)' }}>
      <h3>Créer une nouvelle Maison</h3>
      <div className="form-group">
        <label htmlFor="guildName">Nom de la Maison:</label>
        <input id="guildName" type="text" value={guildName} onChange={(e) => setGuildName(e.target.value)} disabled={creatingGuild} />
      </div>
      <div className="form-group">
        <label htmlFor="guildTag">Tag (3-5 chars):</label>
        <input id="guildTag" type="text" value={guildTag} onChange={(e) => setGuildTag(e.target.value)} disabled={creatingGuild} minLength={3} maxLength={5} />
      </div>
      <div className="form-group">
        <label htmlFor="guildDescription">Description:</label>
        <textarea id="guildDescription" value={guildDescription} onChange={(e) => setGuildDescription(e.target.value)} disabled={creatingGuild} />
      </div>
      <div className="form-group">
        <label htmlFor="guildEmblem">Emblème (URL ou ID):</label>
        <input id="guildEmblem" type="text" value={guildEmblem} onChange={(e) => setGuildEmblem(e.target.value)} disabled={creatingGuild} placeholder="e.g., url_to_emblem.png ou dragon_icon_id"/>
      </div>
      <div className="form-actions">
        <button type="submit" disabled={creatingGuild} className="button-base">
          {creatingGuild ? 'Création en cours...' : 'Soumettre la création'}
        </button>
      </div>
      {createError && <p className="error-message" style={{ marginTop: 'var(--spacing-unit)' }}>{createError}</p>}
    </form>
  );

  const renderJoinGuildList = () => (
    <div className="guild-list-container">
      <h3>Liste des Maisons</h3>
      {loadingGuilds && <p>Loading guilds...</p>}
      {guildsError && <p className="error-message">{guildsError}</p>}
      {!loadingGuilds && !guildsError && listedGuilds.length > 0 && (
        <table className="styled-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Emblème</th>
              <th>Nom</th>
              <th>Tag</th>
              <th>Description</th>
              <th>Membres</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {listedGuilds.map((guild) => (
              <tr key={guild.id}>
                <td>
                  {guild.emblem ? (
                    guild.emblem.startsWith('http') ?
                    <img src={guild.emblem} alt={guild.name} style={{width: '32px', height: '32px', objectFit: 'cover'}}/> :
                    <span>{guild.emblem}</span>
                  ): '-'}
                </td>
                <td>{guild.name}</td>
                <td>{guild.tag}</td>
                <td style={{maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}} title={guild.description}>{guild.description}</td>
                <td>{guild.memberCount}</td>
                <td>
                  <button
                    onClick={() => handleJoinGuild(guild.id, guild.name)}
                    disabled={joiningGuildId === guild.id || !!(user && user.guildId)}
                    className="button-base"
                  >
                    {joiningGuildId === guild.id ? 'Joining...' : 'Rejoindre'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!loadingGuilds && !guildsError && listedGuilds.length === 0 && (
        <p>Aucune maison n'est actuellement disponible pour rejoindre.</p>
      )}
    </div>
  );

  // Determine content based on user's guild status
  const renderContent = () => {
    if (user && user.guildId) {
      // User is in a guild - Show guild details
      if (isLoadingGuildDetails) return <p>Loading your guild details...</p>;
      if (guildDetailsError) return <p className="error-message">Error: {guildDetailsError}</p>;

      if (currentGuildDetails) {
        return (
          <div className="guild-details-container">
            <h3>
              {currentGuildDetails.emblem && currentGuildDetails.emblem.startsWith('http') ?
                <img src={currentGuildDetails.emblem} alt="" style={{width: '40px', height: '40px', marginRight: '10px', verticalAlign: 'middle'}}/> :
                currentGuildDetails.emblem && <span style={{marginRight: '10px'}}>{currentGuildDetails.emblem}</span>}
              {currentGuildDetails.name} [{currentGuildDetails.tag}]
            </h3>
            <p><i>{currentGuildDetails.description}</i></p>
            <p>Maître de Maison: {currentGuildDetails.members.find(m => m.uid === currentGuildDetails.masterId)?.displayName || currentGuildDetails.masterId}</p>
            <h4>Membres ({currentGuildDetails.memberCount}):</h4>
            {currentGuildDetails.members && currentGuildDetails.members.length > 0 ? (
              <ul className="guild-member-list">
                {currentGuildDetails.members.map((member) => (
                  <li key={member.uid}>{member.displayName || member.uid} ({member.role})</li>
                ))}
              </ul>
            ) : (
              <p>Cette maison n'a pas encore de membres (cela ne devrait pas arriver si le compteur est > 0).</p>
            )}
            <button
              onClick={handleLeaveGuild}
              disabled={isLeavingGuild}
              className="button-base delete-button"
              style={{ marginTop: 'var(--spacing-unit)' }}
            >
              {isLeavingGuild ? 'Départ en cours...' : 'Quitter la Maison'}
            </button>
            {leaveGuildError && <p className="error-message" style={{ marginTop: 'var(--spacing-unit)' }}>{leaveGuildError}</p>}
          </div>
        );
      }
      // If successfully joined but details are still loading or failed
      if (joinSuccessMessage && !isLoadingGuildDetails) {
        return (
          <div>
            <p className="success-message">{joinSuccessMessage}</p>
            <p>Chargement des détails de votre nouvelle maison...</p>
          </div>
        );
      }
      return <p>Vous êtes membre d'une maison, mais ses détails n'ont pu être chargés.</p>;
    }

    // User is NOT in a guild - Show options to create or join with tabs
    return (
      <>
        {renderTabs()}
        {createSuccessMessage && <p className="success-message" style={{ marginBottom: 'var(--spacing-unit)' }}>{createSuccessMessage}</p>}
        {joinError && <p className="error-message" style={{ marginBottom: 'var(--spacing-unit)' }}>{joinError}</p>}
        {leaveGuildSuccessMessage && <p className="success-message" style={{ marginBottom: 'var(--spacing-unit)' }}>{leaveGuildSuccessMessage}</p>}

        {activeTab === 'create' && renderCreateGuildForm()}
        {activeTab === 'join' && renderJoinGuildList()}
      </>
    );
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{width: '800px', maxHeight: '90vh', overflowY: 'auto'}}>
        <h2>Gestion des Maisons</h2>
        {renderContent()}
        <button onClick={onClose} className="button-base button-secondary" style={{ marginTop: 'var(--spacing-unit)' }}>Fermer</button>
      </div>
    </div>
  );
};

export default GuildManagementModal;
