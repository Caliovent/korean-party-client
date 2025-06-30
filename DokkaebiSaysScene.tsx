// DokkaebiSaysScene.tsx
import React from 'react';

interface DokkaebiSaysSceneProps {
  gameId: string;
  onFinish: () => Promise<void>;
}

const DokkaebiSaysScene: React.FC<DokkaebiSaysSceneProps> = ({ gameId, onFinish }) => {
  return (
    <div style={{ padding: '20px', textAlign: 'center', border: '2px dashed green', margin: '20px' }}>
      <h1>Dokkaebi Says Mini-Game</h1>
      <p>Game ID: {gameId}</p>
      <p>This is a placeholder for the Dokkaebi Says mini-game.</p>
      <button onClick={onFinish} style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}>
        Finish Mini-Game (Placeholder)
      </button>
    </div>
  );
};

export default DokkaebiSaysScene;
