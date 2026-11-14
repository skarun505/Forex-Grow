import React, { useState } from 'react';
import { useTrading } from '../context/TradingContext';
import { Search, X, TrendingUp, TrendingDown, Star, Sparkles } from 'lucide-react';
import { AssetCategory } from '../types';

interface AssetSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AssetSelectorModal: React.FC<AssetSelectorModalProps> = ({ isOpen, onClose }) => {
  const { assets, selectedAsset, selectAsset, theme } = useTrading();
  const isLight = theme === 'light';
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<'ALL' | AssetCategory>('ALL');
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('forexgrow_favorites') || localStorage.getItem('quotex_favorites') || '["EURUSD_OTC", "BTCUSDT", "GOLD_OTC"]');
    } catch {
      return ['EURUSD_OTC', 'BTCUSDT', 'GOLD_OTC'];
    }
  });

  if (!isOpen) return null;

  const toggleFavorite = (e: React.MouseEvent, assetId: string) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = prev.includes(assetId) ? prev.filter((id) => id !== assetId) : [...prev, assetId];
      localStorage.setItem('forexgrow_favorites', JSON.stringify(next));
      return next;
    });
  };

  const filteredAssets = assets
    .filter((asset) => {
      const matchesCategory = filterCategory === 'ALL' || asset.category === filterCategory;
      const matchesSearch =
        asset.name.toLowerCase().includes(search.toLowerCase()) ||
        asset.id.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      const aFav = favorites.includes(a.id) ? 1 : 0;
      const bFav = favorites.includes(b.id) ? 1 : 0;
      if (bFav !== aFav) return bFav - aFav;
      return b.payout - a.payout;
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-2 sm:p-4">
      <div className={`w-full max-w-xl border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88dvh] transition-colors duration-200 ${
        isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#1a1f2e] border-[#2e354b] text-white'
      }`}>
        {/* Header */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${
          isLight ? 'border-slate-200' : 'border-[#2e354b]'
        }`}>
          <div className="flex items-center space-x-2.5">
            <Sparkles className="w-5 h-5 text-emerald-500" />
            <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Select Trading Market ({assets.length} Assets)
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-xl transition ${
              isLight ? 'text-slate-400 hover:text-slate-800 hover:bg-slate-100' : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Categories */}
        <div className={`p-3 sm:p-4 space-y-2.5 border-b ${
          isLight ? 'border-slate-200' : 'border-[#2e354b]/50'
        }`}>
          <div className={`flex items-center border rounded-2xl px-3.5 py-2 ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#121620] border-[#2e354b]'
          }`}>
            <Search className={`w-4 h-4 mr-2.5 ${isLight ? 'text-slate-400' : 'text-gray-400'}`} />
            <input
              type="text"
              placeholder="Search markets (EUR, BTC, Gold, Oil, Dow, Solana)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`bg-transparent w-full text-xs sm:text-sm focus:outline-none ${
                isLight ? 'text-slate-900 placeholder-slate-400' : 'text-white placeholder-gray-500'
              }`}
            />
          </div>

          <div className="flex space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
            {(['ALL', 'crypto', 'forex', 'commodities', 'indices'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1 rounded-xl text-xs font-bold uppercase transition flex-shrink-0 ${
                  filterCategory === cat
                    ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 font-black'
                    : (isLight
                        ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                        : 'bg-[#121620] text-gray-400 hover:text-white border border-[#2e354b]')
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Assets List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
          {filteredAssets.map((asset) => {
            const isSelected = selectedAsset?.id === asset.id;
            const isFav = favorites.includes(asset.id);
            const isPositive = (asset.change24h ?? 0) >= 0;

            return (
              <div
                key={asset.id}
                onClick={() => {
                  selectAsset(asset.id);
                  onClose();
                }}
                className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer border transition ${
                  isSelected
                    ? (isLight ? 'bg-emerald-50 border-emerald-400 shadow-sm' : 'bg-[#222838] border-trade-green/50 shadow-md')
                    : (isLight
                        ? 'bg-slate-50 hover:bg-slate-100 border-slate-200/70 hover:border-slate-300'
                        : 'bg-[#121620]/60 hover:bg-[#222838] border-transparent hover:border-[#2e354b]')
                }`}
              >
                <div className="flex items-center space-x-3">
                  <button
                    onClick={(e) => toggleFavorite(e, asset.id)}
                    className="p-1 text-gray-500 hover:text-amber-400 transition"
                  >
                    <Star className={`w-4 h-4 ${isFav ? 'text-amber-400 fill-amber-400' : ''}`} />
                  </button>

                  <div>
                    <div className={`text-xs sm:text-sm font-bold flex items-center space-x-1.5 ${
                      isLight ? 'text-slate-900' : 'text-white'
                    }`}>
                      <span>{asset.name}</span>
                      {asset.isRealFeed && (
                        <span className="text-[8px] font-bold text-emerald-500 bg-emerald-500/15 px-1 py-0.2 rounded border border-emerald-500/30">
                          LIVE
                        </span>
                      )}
                    </div>
                    <div className={`text-xs font-mono mt-0.5 ${
                      isLight ? 'text-slate-500' : 'text-gray-400'
                    }`}>
                      {asset.currentPrice.toFixed(asset.decimalPlaces)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className="text-right">
                    <div
                      className={`text-xs font-bold flex items-center justify-end space-x-1 ${
                        isPositive ? 'text-trade-green' : 'text-trade-red'
                      }`}
                    >
                      {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      <span>{isPositive ? `+${asset.change24h}%` : `${asset.change24h}%`}</span>
                    </div>
                  </div>

                  <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-black text-xs sm:text-sm px-2.5 py-1 rounded-xl">
                    +{asset.payout}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
