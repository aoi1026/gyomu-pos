'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ServiceSession, SessionCast } from '@/lib/mock-data';
import { mockSessions } from '@/lib/mock-data';

interface SessionContextType {
  sessions: ServiceSession[];
  addSession: (session: ServiceSession) => void;
  updateSession: (sessionId: string, updates: Partial<ServiceSession>) => void;
  getCustomerSession: (customerId: string) => ServiceSession | undefined;
  getTableSession: (tableId: string) => ServiceSession | undefined;
  closeSession: (sessionId: string) => void;
  addCastToSession: (sessionId: string, cast: SessionCast) => void;
  removeCastFromSession: (sessionId: string, staffId: string) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<ServiceSession[]>(mockSessions);

  const addSession = (session: ServiceSession) => {
    setSessions(prev => [...prev, session]);
  };

  const updateSession = (sessionId: string, updates: Partial<ServiceSession>) => {
    setSessions(prev => 
      prev.map(session => 
        session.id === sessionId 
          ? { ...session, ...updates }
          : session
      )
    );
  };

  const getCustomerSession = (customerId: string) => {
    return sessions.find(s => s.customer_id === customerId && s.status === 'open');
  };

  const getTableSession = (tableId: string) => {
    return sessions.find(s => s.table_seat_id === tableId && s.status === 'open');
  };

  const addCastToSession = (sessionId: string, cast: SessionCast) => {
    setSessions(prev => 
      prev.map(session => 
        session.id === sessionId 
          ? { 
              ...session, 
              participating_casts: [...session.participating_casts, cast]
            }
          : session
      )
    );
  };

  const removeCastFromSession = (sessionId: string, staffId: string) => {
    setSessions(prev => 
      prev.map(session => 
        session.id === sessionId 
          ? { 
              ...session, 
              participating_casts: session.participating_casts.map(cast => 
                cast.staff_id === staffId 
                  ? { ...cast, left_at: new Date().toISOString() }
                  : cast
              )
            }
          : session
      )
    );
  };

  const closeSession = (sessionId: string) => {
    setSessions(prev => 
      prev.map(session => 
        session.id === sessionId 
          ? { ...session, status: 'settled', closed_at: new Date().toISOString() }
          : session
      )
    );
    
    // Update table status when session is closed
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      // Update mock data for consistency
      const { mockTables } = require('@/lib/mock-data');
      mockTables.forEach((table: any, index: number) => {
        if (table.id === session.table_seat_id) {
          mockTables[index] = { ...table, status: 'available' };
        }
      });
    }
  };

  return (
    <SessionContext.Provider value={{
      sessions,
      addSession,
      updateSession,
      getCustomerSession,
      getTableSession,
      closeSession,
      addCastToSession,
      removeCastFromSession
    }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
