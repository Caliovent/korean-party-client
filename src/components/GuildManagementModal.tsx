import React, { useEffect, useState } from 'react';
import { getGuilds } from '../services/gameService';
import type { Guild } from '../types/guild';

interface GuildManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GuildManagementModal: React.FC<GuildManagementModalProps> = ({ isOpen, onClose }) => {
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const fetchGuilds = async () => {
        try {
          setLoading(true);
          const fetchedGuilds = await getGuilds();
          setGuilds(fetchedGuilds);
          setError(null);
        } catch (err) {
          console.error("Error fetching guilds in component:", err);
          setError('Failed to fetch guilds.');
          setGuilds([]); // Clear guilds on error
        } finally {
          setLoading(false);
        }
      };
      fetchGuilds();
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', width: '500px' }}>
        <h2>Guild Management</h2>
        {loading && <p>Loading guilds...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {!loading && !error && (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Tag</th>
                <th>Members</th>
              </tr>
            </thead>
            <tbody>
              {guilds.map((guild) => (
                <tr key={guild.id}>
                  <td>{guild.name}</td>
                  <td>{guild.tag}</td>
                  <td>{guild.members.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <button onClick={onClose} style={{ marginTop: '20px' }}>Close</button>
      </div>
    </div>
  );
};

export default GuildManagementModal;
