"use client";

import { createContext, useContext, useEffect, useState } from "react";

// The developer view (side panel, model and timing lines, match scores) is hidden from normal
// visitors and shown with ?details=1 or #details. Read in the browser, so it works with the static
// export; it lasts for that page view only.

/** True when a URL's query or hash asks for the developer view. */
export function wantsDetails(search: string, hash: string): boolean {
  const value = new URLSearchParams(search).get("details");
  if (value === "1" || value === "true") return true;
  return hash.replace(/^#/, "").toLowerCase() === "details";
}

/** Reads the current URL after the page loads, and again when the hash changes. */
export function useDetailsMode(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const read = () => setOn(wantsDetails(window.location.search, window.location.hash));
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  return on;
}

/** Whether the developer view is on, shared from Chat down to each message. */
export const DetailsContext = createContext(false);

export function useDetails(): boolean {
  return useContext(DetailsContext);
}
