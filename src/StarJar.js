import React, { useEffect, useState, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';

import compliments from './complimentData'; 

const maskImageSrc = '/jar/spawn-mask.png';

const createMaskContext = () => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = maskImageSrc;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.drawImage(img, 0, 0, 300, 300);
      resolve(ctx);
    };

    img.onerror = () => {
      resolve(null);
    };
  });
};

const getNonOverlappingPosition = async (existing, radius = 32) => {
  const ctx = await createMaskContext();
  if (!ctx) return { x: 150, y: 180 };

  const halfSize = radius / 2;
  let attempts = 0;

  while (attempts < 1000) {
    const x = Math.floor(Math.random() * 300);
    const y = Math.floor(Math.random() * 300);

    const corners = [
      { x: x - halfSize, y: y - halfSize },
      { x: x + halfSize, y: y - halfSize },
      { x: x - halfSize, y: y + halfSize },
      { x: x + halfSize, y: y + halfSize },
    ];

    const allValid = corners.every(({ x, y }) => {
      if (x < 0 || x >= 300 || y < 0 || y >= 300) return false;
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      return pixel[3] >= 50;
    });

    const notTooClose = existing.every((pos) => {
      const dx = pos.x - x;
      const dy = pos.y - y;
      return dx * dx + dy * dy > radius * radius;
    });

    if (allValid && notTooClose) return { x, y };
    attempts++;
  }

  return { x: 150, y: 180 };
};

const Star = React.forwardRef(({ src, x, y, updateFinalPosition }, ref) => {
  const controls = useAnimation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    controls.start({
      x: x - 16,
      y: y - 16,
      scale: [0, 1.2, 1],
      transition: { duration: 0.0, ease: "easeOut" }
    });
    setMounted(true);
  }, [x, y]);

  React.useImperativeHandle(ref, () => ({
    async shake() {
      if (!mounted) return;

      const ctx = await createMaskContext();
      if (!ctx) return;

      const starSize = 32;
      const halfSize = starSize / 2;

      let finalX = x;
      let finalY = y;

      for (let i = 0; i < 8; i++) {
        let newX = finalX + (Math.random() - 0.5) * 20;
        let newY = finalY + (Math.random() - 0.5) * 20;

        const corners = [
          { x: newX - halfSize, y: newY - halfSize },
          { x: newX + halfSize, y: newY - halfSize },
          { x: newX - halfSize, y: newY + halfSize },
          { x: newX + halfSize, y: newY + halfSize },
        ];

        const isValid = corners.every(({ x, y }) => {
          if (x < 0 || x >= 300 || y < 0 || y >= 300) return false;
          const pixel = ctx.getImageData(x, y, 1, 1).data;
          return pixel[3] >= 50;
        });

        if (!isValid) continue;

        await controls.start({
          x: newX - 16,
          y: newY - 16,
          transition: { duration: 0.08 }
        });

        finalX = newX;
        finalY = newY;
      }

      await controls.start({
        x: finalX - 16,
        y: finalY - 16,
        transition: { duration: 0.4, ease: 'easeOut' }
      });

      updateFinalPosition(finalX, finalY);
    }
  }));

  return (
    <motion.img
      src={src}
      alt="star"
      className="absolute w-8 h-8 pointer-events-none"
      animate={controls}
      initial={{ x: x - 16, y: y - 16, scale: 0 }}
      style={{ zIndex: 5 }}
    />
  );
});

export default function StarJar({ onComplimentUnlocked }) {
  const [stars, setStars] = useState([]);
  const [hasSpawned, setHasSpawned] = useState(false);
  const [wish, setWish] = useState('');
  const [showVideo, setShowVideo] = useState(false);
  const starRefs = useRef([]);
  const [showResetModal, setShowResetModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('jarStars') || '[]');
    if (saved.length > 0) {
      setStars(saved);
      setHasSpawned(true);
      starRefs.current = saved.map(() => React.createRef());
    }
  }, []);

  useEffect(() => {
    if (hasSpawned) {
      localStorage.setItem('jarStars', JSON.stringify(stars));
    }
  }, [stars, hasSpawned]);

  const spawnStars = async () => {
    const generated = [];
    for (let i = 0; i < compliments.length; i++) {
      const pos = await getNonOverlappingPosition(generated);
      generated.push({
        id: `star-${i}`,
        src: compliments[i].image,
        x: pos.x,
        y: pos.y,
        compliment: compliments[i].text
      });
    }
    setStars(generated);
    setHasSpawned(true);
    setWish('');
    setShowVideo(false);
    starRefs.current = generated.map(() => React.createRef());
    localStorage.setItem('jarStars', JSON.stringify(generated));
  };

  const updateStarPosition = (index, x, y) => {
    setStars((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], x, y };
      return updated;
    });
  };

  const shakeStars = async () => {
    await Promise.all(
      starRefs.current.map(ref => ref.current?.shake?.())
    );
  };

  const makeWish = async () => {
    if (!hasSpawned || stars.length === 0) return;
  
    const selectedIndex = Math.floor(Math.random() * stars.length);
    const selectedStar = stars[selectedIndex];
  
    await shakeStars(); // 🔄 Do shaking first before mutation
  
    // ❗Ensure compliment is correct
    const complimentText = compliments.find(c => c.image === selectedStar.src)?.text;
    if (!complimentText) return;
  
    // 🔄 Now remove from refs + state
    starRefs.current.splice(selectedIndex, 1);
    setStars((prev) => {
      const updated = [...prev];
      updated.splice(selectedIndex, 1);
      localStorage.setItem('jarStars', JSON.stringify(updated));
      return updated;
    });
  
    // 🗂️ Update Dex
    const prev = JSON.parse(localStorage.getItem('unlockedCompliments') || '[]');
    const updated = [...new Set([...prev, complimentText])];
    localStorage.setItem('unlockedCompliments', JSON.stringify(updated));
  
    setWish(complimentText);
    setShowVideo(true);

  };  

  const resetJar = () => {
    localStorage.removeItem('jarStars');
    localStorage.removeItem('unlockedCompliments');
    setStars([]);
    setHasSpawned(false);
    setWish(null);
    setShowVideo(false);
    setSelectedCompliment(null);
    setPasswordInput('');
    setShowResetModal(false);
    starRefs.current = [];
  };

  const [selectedCompliment, setSelectedCompliment] = useState(null);

  const handlePasswordSubmit = () => {
    if (passwordInput === 'kakalove0608') {
      resetJar();
    } else {
      alert('Why you trying to break the law');
    }
  };
  
  return (
    <div className="flex flex-col items-center mt-10">
      <div className="relative w-[300px] h-[300px]">
        <img src="/jar/back.png" alt="jar back" className="absolute inset-0 w-full h-full object-contain z-0" />
        {stars.map((star, i) =>
          star?.src ? ( // ✅ Prevent broken image rendering
            <Star
              key={star.id}
              src={star.src}
              x={star.x}
              y={star.y}
              ref={starRefs.current[i]}
              updateFinalPosition={(x, y) => updateStarPosition(i, x, y)}
            />
          ) : null
        )}
        <img src="/jar/lid.png" alt="jar lid" className="absolute inset-0 w-full h-full object-contain z-10" />
      </div>

      <div className="flex gap-4 mt-6 flex-wrap justify-center">
        {!hasSpawned ? (
         <motion.button
         className="bg-[#D8D1EF] hover:bg-[#CFC6EA]
                    text-[#5C5575] text-lg px-6 py-3 rounded-full
                    shadow-md font-semibold transition
                    hover:scale-105 duration-200 ease-out
                    backdrop-blur-sm border border-[#E9E3F9]"
         onClick={spawnStars}
       >
         Press me!
       </motion.button>
       
        ) : (
          <>
            <motion.button
            className="bg-white/30 backdrop-blur-md
                        border border-[#D1D9EC] text-sm text-[#555]
                        px-4 py-2 rounded-full shadow-sm
                        hover:bg-white/50 hover:scale-105 transition"
            onClick={shakeStars}
            >
            Shake me
            </motion.button>

            
            <motion.button
            className="bg-[#bdaddb] hover:bg-[#b2d0f7] text-white 
                        text-lg px-6 py-3 rounded-full font-semibold 
                        shadow-md transition hover:scale-105 disabled:opacity-50"
            onClick={makeWish}
            disabled={stars.length === 0}
            >
            Make a wish! ✨
            </motion.button>
          </>
        )}
      </div>

      <div className="mt-7 text-center h-24 flex items-center justify-center">
      {showVideo && (
          <video
            playsInline
            autoPlay
            muted
            disablePictureInPicture
            className="w-49 h-36 object-contain"
            onEnded={() => setShowVideo(false)}
          >
            <source src="/stars/unravel.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        )}
        {!showVideo && wish && (
          <div className="text-center flex flex-col items-center gap-2">
            <p className="text-[#6D679D] text-xl font-semibold">✨ {wish} ✨</p>
            <button
              onClick={() => {
                const complimentObj = compliments.find(c => c.text === wish);

                setSelectedCompliment({
                  text: complimentObj?.text || wish,
                  image: complimentObj?.image || '/stars/default.png',
                  description:
                    complimentObj?.description ||
                    'This star reflects one of your amazing qualities 💫 Keep collecting more!',
                  locked: false,
                });
              }}
              className="mt-1 px-3 py-1 rounded-full text-sm bg-white text-[#6D679D] border border-[#d6d2e8] hover:bg-[#f3f0fa] transition"
            >
              Read more
            </button>
          </div>
        )}

      </div>

      {selectedCompliment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full relative text-center">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={() => setSelectedCompliment(null)}
            >
              ✕
            </button>
            <img
              src={selectedCompliment.image}
              alt={selectedCompliment.text}
              className="w-16 h-16 mx-auto mb-4"
            />
            <h3 className="text-lg font-bold text-[#6D679D]">{selectedCompliment.text}</h3>
            <p className="text-sm text-gray-500 mt-2">
            {selectedCompliment.description}
            </p>
          </div>
        </div>
      )}

      {/* Reset Button Fixed Bottom Right */}
      {hasSpawned && (
        <button
          className="fixed bottom-4 right-4 bg-[#D3DCE6] hover:bg-[#C6D0DB] text-sm text-black px-4 py-2 rounded-full shadow z-50"
          onClick={() => setShowResetModal(true)}
        >
          Reset Jar
        </button>
      )}

      {/* Password Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-80 text-center">
            <h3 className="text-lg font-semibold mb-4">Enter password to reset</h3>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded mb-4"
              placeholder="Password"
            />
            <div className="flex justify-center gap-4">
              <button
                className="bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded"
                onClick={() => setShowResetModal(false)}
              >
                Cancel
              </button>
              <button
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                onClick={handlePasswordSubmit}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
