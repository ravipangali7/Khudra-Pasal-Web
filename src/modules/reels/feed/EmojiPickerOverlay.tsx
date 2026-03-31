import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X } from 'lucide-react';

type EmojiCategory = {
  key: string;
  label: string;
  icon: string;
  emojis: string[];
};

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    key: 'recent',
    label: 'Recent',
    icon: '🕘',
    emojis: ['😀', '😂', '🥲', '😍', '🔥', '👏', '🙏', '👍', '❤️', '🎉', '😎', '🥳'],
  },
  {
    key: 'smileys',
    label: 'Smileys & People',
    icon: '🙂',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '🥹', '😂', '🤣', '🥲', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘',
      '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😕', '😔', '😢',
      '😭', '😤', '😠', '🤯', '😳', '🥶', '🥵', '😴', '🤗', '🤭', '🫶', '🙏', '👍', '👎', '👏', '🙌',
    ],
  },
  {
    key: 'food',
    label: 'Food & Drink',
    icon: '🍔',
    emojis: [
      '🍎', '🍌', '🍇', '🍉', '🍓', '🥭', '🍍', '🥑', '🍅', '🌽', '🥕', '🍄', '🍞', '🥨', '🧀', '🍗', '🍖', '🍤',
      '🍕', '🍔', '🌭', '🍟', '🥪', '🌮', '🌯', '🍜', '🍛', '🍣', '🍱', '🥟', '🍰', '🎂', '🍫', '🍿', '☕', '🍵',
    ],
  },
  {
    key: 'activities',
    label: 'Activities',
    icon: '⚽',
    emojis: [
      '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏓', '🏸', '🥊', '🥋', '🎯', '🎳', '🛹', '🎮', '🧩', '🎨', '🎭', '🎤',
      '🎧', '🎼', '🎬', '🎟️', '🎪', '🧘', '🏋️', '🏃', '🚴', '🏊', '⛹️', '🤸', '🏆', '🥇',
    ],
  },
  {
    key: 'travel',
    label: 'Travel & Places',
    icon: '🌍',
    emojis: [
      '🚗', '🚕', '🚌', '🚑', '🚓', '🏎️', '🚜', '✈️', '🚀', '⛵', '🚲', '🛵', '🛺', '🗻', '🏝️', '🏞️', '🏙️', '🌋',
      '🌉', '🌆', '🌃', '🌅', '🌇', '🌍', '🌎', '🌏', '🌙', '⭐', '☀️', '⛅', '🌧️', '⛈️', '❄️',
    ],
  },
];

type Props = {
  open: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
};

const EmojiPickerOverlay: React.FC<Props> = ({ open, onClose, onSelectEmoji }) => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('recent');

  const visibleCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return EMOJI_CATEGORIES;
    return EMOJI_CATEGORIES
      .map((cat) => ({
        ...cat,
        emojis: cat.emojis.filter((emoji) => emoji.includes(q)),
      }))
      .filter((cat) => cat.emojis.length > 0);
  }, [search]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[260] bg-zinc-950/95 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="h-full w-full mx-auto max-w-[520px] flex flex-col border-l border-r border-white/10 bg-zinc-950"
            initial={{ y: 40, opacity: 0.9 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0.8 }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          >
            <div className="px-4 pt-4 pb-3 border-b border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-white text-base font-semibold">Emoji Picker</h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center"
                  aria-label="Close emoji picker"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center rounded-2xl border border-emerald-400 px-3 bg-black/30">
                <Search className="w-4 h-4 text-white/70" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search emoji"
                  className="w-full bg-transparent border-none outline-none text-white text-sm px-2 py-3 placeholder:text-white/45"
                />
              </div>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {EMOJI_CATEGORIES.map((cat) => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setActiveCategory(cat.key)}
                    className={`px-3 py-2 rounded-xl text-xs whitespace-nowrap transition ${
                      activeCategory === cat.key ? 'bg-emerald-500 text-black font-semibold' : 'bg-white/10 text-white/80'
                    }`}
                  >
                    <span className="mr-1">{cat.icon}</span>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
              {(search ? visibleCategories : EMOJI_CATEGORIES.filter((cat) => cat.key === activeCategory)).map((cat) => (
                <section key={cat.key}>
                  <h4 className="text-white/70 text-sm font-medium mb-3">{cat.label}</h4>
                  <div className="grid grid-cols-8 sm:grid-cols-9 gap-2">
                    {cat.emojis.map((emoji) => (
                      <button
                        key={`${cat.key}-${emoji}`}
                        type="button"
                        onClick={() => onSelectEmoji(emoji)}
                        className="h-11 rounded-xl bg-white/5 hover:bg-white/15 active:scale-95 transition text-2xl"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="px-4 py-3 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="w-full h-11 rounded-xl bg-white/10 text-white text-sm"
              >
                Done
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EmojiPickerOverlay;
