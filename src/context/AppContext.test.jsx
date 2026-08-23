import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, render, act, waitFor } from '@testing-library/react';
// eslint-disable-next-line no-unused-vars -- required for JSX in .jsx files (classic runtime)
import React from 'react';
import { AppProvider, useApp } from '../context/AppContext';

function wrapper({ children }) {
  return <AppProvider>{children}</AppProvider>;
}

describe('AppContext', () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset URL — deep-link sync (?v=ID) leaks across tests via jsdom history
    window.history.replaceState(null, '', '/');
  });

  it('provides default state', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    expect(result.current.currentVideo.id).toBe('');
    expect(result.current.queue).toEqual([]);
    expect(result.current.history).toEqual([]);
    expect(result.current.autoplayNext).toBe(true);
    expect(result.current.theme).toBe('dark');
  });

  it('throws when used outside provider', () => {
    function Broken() {
      useApp();
      return null;
    }
    // Suppress React error boundary console noise
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(() => render(<Broken />)).toThrow(/useApp must be used within AppProvider/);
    } finally {
      spy.mockRestore();
    }
  });

  it('handlePlay sets current video and prepends history', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => {
      result.current.handlePlay('abc12345678', 'video', 'Test Video');
    });
    expect(result.current.currentVideo).toEqual({
      id: 'abc12345678',
      type: 'video',
      title: 'Test Video',
    });
    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0].id).toBe('abc12345678');
  });

  it('history dedupes by id and caps at 50', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => {
      for (let i = 0; i < 60; i++) {
        result.current.handlePlay(`vid${String(i).padStart(8, '0')}`, 'video', `V${i}`);
      }
    });
    expect(result.current.history.length).toBeLessThanOrEqual(50);
    // Replaying an existing id moves it to front instead of duplicating
    const firstId = result.current.history[0].id;
    act(() => {
      result.current.handlePlay(firstId, 'video', 'Again');
    });
    expect(result.current.history.filter((h) => h.id === firstId)).toHaveLength(1);
  });

  it('addToQueue dedupes and removeFromQueue removes by index', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const video = { id: 'vid11111111', title: 'One' };
    act(() => {
      result.current.addToQueue(video);
      result.current.addToQueue(video); // duplicate — ignored
    });
    expect(result.current.queue).toHaveLength(1);
    act(() => {
      result.current.removeFromQueue(0);
    });
    expect(result.current.queue).toHaveLength(0);
  });

  it('reorderQueue moves items correctly', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => {
      result.current.addToQueue({ id: 'aaaaaaaaaaa', title: 'A' });
      result.current.addToQueue({ id: 'bbbbbbbbbbb', title: 'B' });
      result.current.addToQueue({ id: 'ccccccccccc', title: 'C' });
    });
    act(() => {
      result.current.reorderQueue(2, 0);
    });
    expect(result.current.queue.map((q) => q.title)).toEqual(['C', 'A', 'B']);
    // Out-of-bounds is a no-op
    act(() => {
      result.current.reorderQueue(-1, 5);
    });
    expect(result.current.queue.map((q) => q.title)).toEqual(['C', 'A', 'B']);
  });

  it('clearQueue empties the queue', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => {
      result.current.addToQueue({ id: 'aaaaaaaaaaa', title: 'A' });
    });
    act(() => {
      result.current.clearQueue();
    });
    expect(result.current.queue).toHaveLength(0);
  });

  it('playNextInQueue plays and removes first item when autoplay on', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => {
      result.current.addToQueue({ id: 'aaaaaaaaaaa', title: 'First' });
      result.current.addToQueue({ id: 'bbbbbbbbbbb', title: 'Second' });
    });
    act(() => {
      result.current.playNextInQueue();
    });
    expect(result.current.currentVideo.id).toBe('aaaaaaaaaaa');
    expect(result.current.queue).toHaveLength(1);
    expect(result.current.queue[0].id).toBe('bbbbbbbbbbb');
  });

  it('playNextInQueue does nothing when autoplay off', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => {
      result.current.toggleAutoplayNext();
    });
    act(() => {
      result.current.addToQueue({ id: 'aaaaaaaaaaa', title: 'First' });
    });
    act(() => {
      result.current.playNextInQueue();
    });
    expect(result.current.currentVideo.id).toBe('');
    expect(result.current.queue).toHaveLength(1);
  });

  it('handleSearch aborts stale requests', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    let resolveFirst;
    const firstPromise = new Promise((resolve) => { resolveFirst = resolve; });

    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => firstPromise)
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ items: [{ url: 'https://www.youtube.com/watch?v=new11111111' }] }),
        })
      );
    vi.stubGlobal('fetch', fetchMock);

    // Start first search (hangs), then a second search that resolves fast
    act(() => {
      result.current.handleSearch('first query');
    });
    await act(async () => {
      await result.current.handleSearch('second query');
    });

    // First search resolves late with different results — must be ignored
    await act(async () => {
      resolveFirst?.({
        ok: true,
        json: () => Promise.resolve({ items: [{ url: 'https://www.youtube.com/watch?v=old11111111' }] }),
      });
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(result.current.searchResults[0]?.url).toContain('new11111111');
    expect(result.current.loadingSearch).toBe(false);
    vi.unstubAllGlobals();
  });

  it('handleSearch sets error when response not ok', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({}) })
    );
    await act(async () => {
      await result.current.handleSearch('fail');
    });
    expect(result.current.searchError).toBe('Search failed');
    vi.unstubAllGlobals();
  });

  it('toggles theme, proxy, theater, autoplay', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => { result.current.toggleTheme(); });
    expect(result.current.theme).toBe('light');
    act(() => { result.current.toggleStreamProxy(); });
    expect(result.current.streamProxy).toBe(true);
    act(() => { result.current.toggleTheater(); });
    expect(result.current.theaterMode).toBe(true);
    act(() => { result.current.toggleAutoplayNext(); });
    expect(result.current.autoplayNext).toBe(false);
  });

  it('clearHistory empties history', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => {
      result.current.handlePlay('abc12345678', 'video', 'T');
    });
    await waitFor(() => {
      expect(result.current.history).toHaveLength(1);
    });
    act(() => {
      result.current.clearHistory();
    });
    expect(result.current.history).toHaveLength(0);
  });
});
