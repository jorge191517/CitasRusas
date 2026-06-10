"use client";

import React, { useState } from "react";
import { motion, useMotionValue, useTransform, useAnimation } from "framer-motion";

export interface DatingProfile {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  country: string;
  city: string;
  languages: string[];
  profession?: string;
  maritalStatus?: string;
  bio?: string;
  interests: string[];
  height?: number;
  imageUrl: string;
  verified: boolean;
}

interface TinderCardProps {
  profile: DatingProfile;
  onSwipe: (direction: "left" | "right" | "up") => void;
}

export default function TinderCard({ profile, onSwipe }: TinderCardProps) {
  const [swiped, setSwiped] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Transform coordinates to rotate cards while dragging
  const rotate = useTransform(x, [-200, 200], [-30, 30]);
  const opacity = useTransform(x, [-150, 0, 150], [0.5, 1, 0.5]);

  const likeOpacity = useTransform(x, [0, 150], [0, 1]);
  const nopeOpacity = useTransform(x, [-150, 0], [1, 0]);
  const superLikeOpacity = useTransform(y, [-150, 0], [1, 0]);

  const controls = useAnimation();

  const handleDragEnd = async (event: any, info: any) => {
    const swipeThreshold = 120;
    const swipeYThreshold = -100;

    if (info.offset.x > swipeThreshold) {
      // Swipe Right (Like)
      setSwiped(true);
      await controls.start({ x: 500, opacity: 0, transition: { duration: 0.2 } });
      onSwipe("right");
    } else if (info.offset.x < -swipeThreshold) {
      // Swipe Left (Dislike)
      setSwiped(true);
      await controls.start({ x: -500, opacity: 0, transition: { duration: 0.2 } });
      onSwipe("left");
    } else if (info.offset.y < swipeYThreshold) {
      // Swipe Up (Super Like)
      setSwiped(true);
      await controls.start({ y: -600, opacity: 0, transition: { duration: 0.2 } });
      onSwipe("up");
    } else {
      // Snap back to center
      controls.start({ x: 0, y: 0, transition: { type: "spring", stiffness: 300, damping: 20 } });
    }
  };

  return (
    <motion.div
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDragEnd={handleDragEnd}
      animate={controls}
      style={{ x, y, rotate, opacity }}
      whileDrag={{ scale: 1.05 }}
      className="absolute w-full max-w-sm h-[500px] bg-card rounded-[32px] border border-primary/20 p-4 shadow-2xl flex flex-col justify-between overflow-hidden cursor-grab active:cursor-grabbing select-none touch-none"
    >
      {/* Overlay badges for Swiping Directions */}
      <motion.div
        style={{ opacity: likeOpacity }}
        className="absolute top-8 left-8 border-4 border-green-500 text-green-500 font-black text-2xl uppercase px-4 py-2 rounded-xl transform -rotate-12 z-20"
      >
        LIKE
      </motion.div>
      <motion.div
        style={{ opacity: nopeOpacity }}
        className="absolute top-8 right-8 border-4 border-red-500 text-red-500 font-black text-2xl uppercase px-4 py-2 rounded-xl transform rotate-12 z-20"
      >
        NOPE
      </motion.div>
      <motion.div
        style={{ opacity: superLikeOpacity }}
        className="absolute bottom-28 left-1/2 -translate-x-1/2 border-4 border-blue-400 text-blue-400 font-black text-2xl uppercase px-4 py-2 rounded-xl z-20"
      >
        SUPER
      </motion.div>

      {/* Picture Frame */}
      <div className="relative flex-grow rounded-2xl bg-[#0A1128] overflow-hidden flex flex-col justify-end p-6 border border-white/5">
        {profile.imageUrl ? (
          <img
            src={profile.imageUrl}
            alt={profile.firstName}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <svg viewBox="0 0 100 100" className="w-32 h-32 text-primary/40">
              <circle cx="50" cy="40" r="20" fill="currentColor" />
              <path d="M20,85 C20,70 30,60 50,60 C70,60 80,70 80,85" fill="currentColor" />
            </svg>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A1128] via-[#0A1128]/20 to-transparent pointer-events-none" />

        {/* Profile Meta */}
        <div className="z-10 text-left pointer-events-none">
          <div className="flex items-center space-x-2">
            <h2 className="font-extrabold text-2xl text-white">
              {profile.firstName}, {profile.age}
            </h2>
            {profile.verified && (
              <span className="px-2 py-0.5 bg-primary/20 text-primary text-[10px] font-bold rounded border border-primary/40">
                ✓ VERIFIED
              </span>
            )}
          </div>
          
          <p className="text-sm text-muted font-medium mt-1">
            📍 {profile.city}, {profile.country}
          </p>

          {profile.profession && (
            <p className="text-xs text-primary/90 mt-1">💼 {profile.profession}</p>
          )}

          <p className="text-xs text-white/80 mt-2 line-clamp-2 italic">
            "{profile.bio}"
          </p>

          {/* Languages spoken */}
          <div className="flex flex-wrap gap-1 mt-3">
            {profile.languages.map((l) => (
              <span
                key={l}
                className="px-2 py-0.5 bg-white/10 rounded-full text-[10px] uppercase font-bold text-white"
              >
                {l}
              </span>
            ))}
          </div>

          {/* Interests */}
          <div className="flex flex-wrap gap-1 mt-2">
            {profile.interests.slice(0, 3).map((interest) => (
              <span
                key={interest}
                className="px-2 py-0.5 bg-[#FF6B8B]/20 text-[#FF6B8B] rounded-full text-[10px] font-semibold"
              >
                #{interest}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions (Just visuals in dragging state, clickable if card is stationary) */}
      <div className="flex justify-around items-center pt-3 z-10">
        <button
          onClick={async () => {
            await controls.start({ x: -500, opacity: 0, transition: { duration: 0.2 } });
            onSwipe("left");
          }}
          className="w-12 h-12 rounded-full bg-[#151F3C] border border-white/10 flex items-center justify-center text-red-500 hover:scale-110 active:scale-95 transition-all shadow-md font-bold"
        >
          ✕
        </button>
        <button
          onClick={async () => {
            await controls.start({ y: -600, opacity: 0, transition: { duration: 0.2 } });
            onSwipe("up");
          }}
          className="w-12 h-12 rounded-full bg-[#151F3C] border border-white/10 flex items-center justify-center text-blue-400 hover:scale-110 active:scale-95 transition-all shadow-md"
        >
          ⭐
        </button>
        <button
          onClick={async () => {
            await controls.start({ x: 500, opacity: 0, transition: { duration: 0.2 } });
            onSwipe("right");
          }}
          className="w-14 h-14 rounded-full bg-premium-gold flex items-center justify-center text-background hover:scale-110 active:scale-95 transition-all shadow-lg font-bold"
        >
          ♥
        </button>
      </div>
    </motion.div>
  );
}
