'use client';

import { useEffect, ReactNode } from 'react';
import { ScreenRecordingDetector } from './ScreenRecordingDetector';

interface SecurityWrapperProps {
  children: ReactNode;
  videoId?: string;
}

export function SecurityWrapper({ children, videoId }: SecurityWrapperProps) {
  useEffect(() => {
    // Disable right-click context menu
    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Disable DevTools shortcuts
    const preventDevTools = (e: KeyboardEvent) => {
      // F12
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }

      // Ctrl+Shift+I (Inspector)
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        return false;
      }

      // Ctrl+Shift+J (Console)
      if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        return false;
      }

      // Ctrl+Shift+C (Element picker)
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        return false;
      }

      // Ctrl+U (View source)
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        return false;
      }

      // Ctrl+S (Save page)
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        return false;
      }
    };

    // Disable text selection on video player area
    const preventSelection = (e: Event) => {
      e.preventDefault();
      return false;
    };

    // Add event listeners
    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('keydown', preventDevTools);
    document.addEventListener('selectstart', preventSelection);

    // Cleanup
    return () => {
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('keydown', preventDevTools);
      document.removeEventListener('selectstart', preventSelection);
    };
  }, []);

  return (
    <>
      <ScreenRecordingDetector videoId={videoId} enabled={true} />
      {children}
    </>
  );
}
