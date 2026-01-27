
import React, { useEffect, useState } from 'react';
import { Notification } from '../types';

interface NotificationCenterProps {
  notifications: Notification[];
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ notifications }) => {
  const [visibleNotif, setVisibleNotif] = useState<Notification | null>(null);

  useEffect(() => {
    if (notifications.length > 0) {
      const last = notifications[notifications.length - 1];
      setVisibleNotif(last);
      const timer = setTimeout(() => setVisibleNotif(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notifications]);

  if (!visibleNotif) return null;

  return (
    <div className="fixed top-4 inset-x-4 z-[300] flex justify-center pointer-events-none">
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 animate-slide-down max-w-sm w-full">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-yellow-500 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-[11px] font-bold text-white/60 uppercase tracking-wider">Actividad reciente</p>
          <p className="text-sm text-white font-medium">
            <span className="font-bold">@{visibleNotif.user}</span> {visibleNotif.text}
          </p>
        </div>
      </div>
    </div>
  );
};
