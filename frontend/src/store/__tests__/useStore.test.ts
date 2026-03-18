import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../useStore';

describe('useStore', () => {
  beforeEach(() => {
    // Reset state before each test
    const { logout } = useStore.getState();
    logout();
  });

  it('should initialize with correct default values', () => {
    const state = useStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.sidebarMode).toBe('network');
    expect(state.isSidebarOpen).toBe(false);
  });

  it('should update sidebar mode', () => {
    const { setSidebarMode } = useStore.getState();
    setSidebarMode('settings');
    expect(useStore.getState().sidebarMode).toBe('settings');
  });

  it('should update notification visibility', () => {
    const { setIsNotifOpen } = useStore.getState();
    setIsNotifOpen(true);
    expect(useStore.getState().isNotifOpen).toBe(true);
  });
});
