import { useEffect, useState } from 'react';

/** Bumps when auth tokens change so reel list queries refetch personalized flags (is_liked, etc.). */
export function useReelsQueryAuthRev(): number {
  const [rev, setRev] = useState(0);
  useEffect(() => {
    const onAuth = () => setRev((r) => r + 1);
    window.addEventListener('khudra-auth-changed', onAuth);
    return () => window.removeEventListener('khudra-auth-changed', onAuth);
  }, []);
  return rev;
}
