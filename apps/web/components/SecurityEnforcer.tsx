"use client";

import { useEffect } from "react";

export default function SecurityEnforcer() {
  useEffect(() => {
    // Force hard reload if the page was restored from the browser's Back/Forward Cache (BFCache)
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        window.location.reload();
      }
    };
    window.addEventListener('pageshow', handlePageShow);

    // Attaching an empty unload listener aggressively disables BFCache on WebKit (Safari) and older browsers
    const handleUnload = () => {};
    window.addEventListener('unload', handleUnload);

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('unload', handleUnload);
    };
  }, []);

  return null;
}
