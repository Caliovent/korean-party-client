import React, { useState } from 'react';
import './ShopModal.css'; // Assurez-vous de créer ce fichier CSS

interface ShopItem {
  id: string;
  name: string;
  image: string; // URL de l'image ou chemin local
  price: number;
  description: string; // Pour la vue détaillée potentielle
  category: 'tenues' | 'familiers' | 'effets' | 'themes';
}

// Données fictives pour la boutique
const FAKE_SHOP_ITEMS: ShopItem[] = [
  // Tenues
  { id: 'tenue1', name: 'Robe de Sorcier Lunaire', image: 'https://via.placeholder.com/150/FFA07A/000000?Text=Tenue1', price: 1200, description: 'Une robe élégante tissée avec des fils de clair de lune.', category: 'tenues' },
  { id: 'tenue2', name: 'Armure du Gardien Stellaire', image: 'https://via.placeholder.com/150/ADD8E6/000000?Text=Tenue2', price: 1500, description: 'Protège contre les maléfices obscurs et brille comme mille étoiles.', category: 'tenues' },
  // Familiers
  { id: 'familier1', name: 'Mini-Dragon de Cendre', image: 'https://via.placeholder.com/150/FFD700/000000?Text=Familier1', price: 2000, description: 'Un compagnon loyal qui crache des petites boules de feu.', category: 'familiers' },
  { id: 'familier2', name: 'Chouette Astrale', image: 'https://via.placeholder.com/150/DA70D6/000000?Text=Familier2', price: 1800, description: 'Messagère des rêves et guide dans les nuits sans lune.', category: 'familiers' },
  // Effets de Sorts
  { id: 'effet1', name: 'Explosion Galactique', image: 'https://via.placeholder.com/150/7FFFD4/000000?Text=Effet1', price: 800, description: 'Remplace l\'effet visuel de votre sort de base par une nébuleuse.', category: 'effets' },
  { id: 'effet2', name: 'Bouclier Runique Ancestral', image: 'https://via.placeholder.com/150/D2691E/000000?Text=Effet2', price: 750, description: 'Invoque des runes protectrices autour de vous.', category: 'effets' },
  // Thèmes de Hub
  { id: 'theme1', name: 'Bibliothèque Céleste', image: 'https://via.placeholder.com/150/B0C4DE/000000?Text=Theme1', price: 2500, description: 'Transformez votre hub en un observatoire des astres.', category: 'themes' },
  { id: 'theme2', name: 'Jardin Zen Lunaire', image: 'https://via.placeholder.com/150/98FB98/000000?Text=Theme2', price: 2200, description: 'Un havre de paix sous une lune éternelle pour votre hub.', category: 'themes' },
];

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabCategory = 'tenues' | 'familiers' | 'effets' | 'themes';

const ShopModal: React.FC<ShopModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabCategory>('tenues');
  const [moonShards] = useState(5000); // Solde fictif, removed setMoonShards

  if (!isOpen) {
    return null;
  }

  const handleBuyItem = (item: ShopItem) => {
    console.log(`Tentative d'achat de : ${item.name} (ID: ${item.id}) pour ${item.price} Éclats de Lune.`);
    // Logique d'achat future ici (ex: vérifier le solde, appeler une API)
    // Pour l'instant, on peut simuler une déduction du solde si l'on veut
    if (moonShards >= item.price) {
      // setMoonShards(moonShards - item.price); // Décommenter pour simuler l'achat
      console.log(`Achat simulé de ${item.name} réussi.`);
    } else {
      console.log(`Pas assez d'Éclats de Lune pour acheter ${item.name}.`);
    }
  };

  const handleItemClick = (item: ShopItem) => {
    // Pour l'instant, loggue les détails. Pourrait ouvrir une sous-modale ou un panneau latéral.
    console.log(`Article cliqué : ${item.name}`, item);
    alert(`Détails de l'article :\nNom : ${item.name}\nDescription : ${item.description}\nPrix : ${item.price} Éclats de Lune`);
  };

  const TABS: { key: TabCategory; label: string }[] = [
    { key: 'tenues', label: 'Tenues' },
    { key: 'familiers', label: 'Familiers' },
    { key: 'effets', label: 'Effets de Sorts' },
    { key: 'themes', label: 'Thèmes de Hub' },
  ];

  const itemsForCurrentTab = FAKE_SHOP_ITEMS.filter(item => item.category === activeTab);

  return (
    <div className="shop-modal-overlay" onClick={onClose}>
      <div className="shop-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="shop-modal-header">
          <h2>L'Échoppe de Maître Kim</h2>
          <div className="moon-shards-balance">
            Solde : {moonShards} Éclats de Lune
          </div>
          <button onClick={onClose} className="shop-modal-close-button">&times;</button>
        </div>

        <div className="shop-modal-tabs">
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`shop-tab-button ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="shop-modal-items-grid">
          {itemsForCurrentTab.length > 0 ? itemsForCurrentTab.map(item => (
            <div key={item.id} className="shop-item-card" >
              <div className="shop-item-image-container" onClick={() => handleItemClick(item)}>
                <img src={item.image} alt={item.name} className="shop-item-image" />
              </div>
              <h3 className="shop-item-name">{item.name}</h3>
              <p className="shop-item-price">{item.price} Éclats de Lune</p>
              <button className="shop-item-buy-button" onClick={() => handleBuyItem(item)}>
                Acheter
              </button>
            </div>
          )) : (
            <p>Aucun article disponible dans cette catégorie pour le moment.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShopModal;
