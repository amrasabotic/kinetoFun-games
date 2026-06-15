'use client';
import { useEffect } from 'react';

export default function RootPage() {
  useEffect(() => {
    // Use a relative URL so this works from file:// and any HTTP base path.
    window.location.replace('./home/');
  }, []);
  return null;
}
