import React, { createContext, useContext, useState, useCallback } from 'react';

type OverlayType =
  | 'model-picker'
  | 'provider-manager'
  | 'provider-wizard'
  | 'history'
  | 'file-explorer'
  | 'key-help'
  | 'keybind-manager'
  | 'mcp-manager'
  | 'mcp-wizard'
  | 'plugin-manager'
  | 'plugin-wizard'
  | 'onboarding'
  | null;

interface OverlayState {
  type: OverlayType;
  props?: Record<string, unknown>;
}

interface OverlayContextValue {
  overlay: OverlayState;
  open: (type: Exclude<OverlayType, null>, props?: Record<string, unknown>) => void;
  close: () => void;
}

const OverlayContext = createContext<OverlayContextValue | null>(null);

export function OverlayProvider({ children }: { children: React.ReactNode }) {
  const [overlay, setOverlay] = useState<OverlayState>({ type: null });

  const open = useCallback((type: Exclude<OverlayType, null>, props?: Record<string, unknown>) => {
    setOverlay({ type, props });
  }, []);

  const close = useCallback(() => setOverlay({ type: null }), []);

<<<<<<< HEAD
  return <OverlayContext.Provider value={{ overlay, open, close }}>{children}</OverlayContext.Provider>;
=======
  return (
    <OverlayContext.Provider value={{ overlay, open, close }}>{children}</OverlayContext.Provider>
  );
>>>>>>> tools_improvement
}

export function useOverlay() {
  const ctx = useContext(OverlayContext);
  if (!ctx) throw new Error('useOverlay must be inside OverlayProvider');
  return ctx;
}
