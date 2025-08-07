// ComplimentDex.js
import React, { useEffect, useState } from 'react';
import ComplimentModal from './ComplimentModal';

import compliments from './complimentData'; 

export default function ComplimentDex() {
  const [unlocked, setUnlocked] = useState([]);
  const [selected, setSelected] = useState(null);

  const loadUnlocked = () => {
    const saved = JSON.parse(localStorage.getItem('unlockedCompliments') || '[]');
    setUnlocked(saved);
  };

  useEffect(() => {
    loadUnlocked();
  }, []);

  return (
    <div className="px-4 py-6">
      <h2 className="text-center text-xl font-medium text-[#6D679D] tracking-wide mb-6">I like you for...</h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 justify-items-center">
        {compliments.map(({ text, image, description }, index) => {
          const isUnlocked = unlocked.includes(text);
          return (
            <div
              key={index}
              className="flex flex-col items-center text-center cursor-pointer"
              onClick={() => setSelected({ text, image, description, locked: !isUnlocked })}
            >
              <img
                src={image}
                alt={text}
                className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 transition-all duration-300 ${
                  isUnlocked ? '' : 'opacity-20 grayscale'
                }`}
              />
              <span className={`mt-1 text-xs sm:text-sm font-medium text-gray-400`}>
                {isUnlocked ? text : '???'}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex justify-center mt-4">
        <button
          className="bg-gray-300 hover:bg-gray-400 text-sm px-4 py-1 rounded-full"
          onClick={loadUnlocked}
        >
          Refresh
        </button>
      </div>

      {selected && (
        <ComplimentModal
          data={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}