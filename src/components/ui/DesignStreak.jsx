import React, { useState, useEffect } from 'react';
import { FiTrendingUp, FiCalendar } from 'react-icons/fi';

const DesignStreak = ({ userId }) => {
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const loadStreak = () => {
      const savedStreak = localStorage.getItem(`streak_${userId}`);
      const savedLastLogin = localStorage.getItem(`lastLogin_${userId}`);
      
      const today = new Date().toDateString();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toDateString();
      
      if (savedLastLogin) {
        const lastLogin = new Date(savedLastLogin).toDateString();
        
        if (lastLogin === today) {
          setStreak(parseInt(savedStreak) || 0);
        } else if (lastLogin === yesterdayStr) {
          const newStreak = (parseInt(savedStreak) || 0) + 1;
          setStreak(newStreak);
          localStorage.setItem(`streak_${userId}`, newStreak);
        } else {
          setStreak(1);
          localStorage.setItem(`streak_${userId}`, 1);
        }
      } else {
        setStreak(1);
        localStorage.setItem(`streak_${userId}`, 1);
      }
      
      localStorage.setItem(`lastLogin_${userId}`, new Date().toISOString());
    };
    
    if (userId) {
      loadStreak();
    }
  }, [userId]);

  return (
    <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg p-6 border border-[#e5e7eb] dark:border-[#374151]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
            <FiTrendingUp className="text-orange-600 dark:text-orange-400 text-xl" />
          </div>
          <h3 className="font-semibold text-[#02090d] dark:text-white">Daily Streak</h3>
        </div>
        <FiCalendar className="text-[#6b7280] dark:text-[#9ca3af]" />
      </div>
      
      <div className="text-3xl font-bold text-[#02090d] dark:text-white mb-2">
        {streak} {streak === 1 ? 'day' : 'days'}
      </div>
      <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">
        Consecutive design days
      </p>
      
      <p className="text-xs text-[#9ca3af] dark:text-[#6b7280] mt-3">
        Streak resets if you miss a day
      </p>
    </div>
  );
};

export default DesignStreak;