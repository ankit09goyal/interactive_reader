"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * Generate a UUID v4 for session tracking
 */
function generateSessionId() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * useReadingAnalytics - Client-side hook for tracking reading analytics
 *
 * Features:
 * - Generates unique sessionId on mount
 * - Tracks time spent on pages/chapters
 * - Debounced API calls (every 10 seconds)
 * - Handles page visibility changes (pause when tab hidden)
 * - Uses sendBeacon for reliable data on page unload
 * - Automatic session management
 *
 * GDPR Compliant: No userId is sent or stored
 *
 * @param {Object} options
 * @param {string} options.bookId - The book being read
 * @param {string} options.locationType - "page" | "chapter" | "cfi"
 * @param {number|null} options.totalPages - Total pages (for PDF)
 * @param {number|null} options.totalChapters - Total chapters (for ePub)
 */
export function useReadingAnalytics({
  bookId,
  locationType = "page",
  totalPages = null,
  totalChapters = null,
}) {
  // Refs for tracking state without re-renders
  const sessionIdRef = useRef(null);
  const currentLocationRef = useRef(null);
  const timeOnLocationRef = useRef(0);
  const lastUpdateTimeRef = useRef(Date.now());
  const isVisibleRef = useRef(true);
  const pendingEventsRef = useRef([]);
  const flushTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  const bookIdRef = useRef(bookId);
  const locationTypeRef = useRef(locationType);
  const totalPagesRef = useRef(totalPages);
  const totalChaptersRef = useRef(totalChapters);

  // Keep refs updated
  useEffect(() => {
    bookIdRef.current = bookId;
    locationTypeRef.current = locationType;
    totalPagesRef.current = totalPages;
    totalChaptersRef.current = totalChapters;
  }, [bookId, locationType, totalPages, totalChapters]);

  /**
   * Send events to the analytics API
   */
  const sendEvents = useCallback(async (events, useBeacon = false) => {
    if (!events.length || !bookIdRef.current) return;

    const payload = {
      bookId: bookIdRef.current,
      events,
    };

    if (useBeacon) {
      // Use sendBeacon for reliable delivery on page unload
      const blob = new Blob([JSON.stringify(payload)], {
        type: "application/json",
      });
      navigator.sendBeacon("/api/analytics/track", blob);
    } else {
      // Use fetch for normal updates
      try {
        await fetch("/api/analytics/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch (error) {
        console.error("Failed to send analytics:", error);
      }
    }
  }, []);

  /**
   * Flush pending events to the API
   */
  const flushEvents = useCallback(
    (useBeacon = false) => {
      if (pendingEventsRef.current.length > 0) {
        sendEvents([...pendingEventsRef.current], useBeacon);
        pendingEventsRef.current = [];
      }
    },
    [sendEvents]
  );

  /**
   * Add event to pending queue and schedule flush
   */
  const queueEvent = useCallback(
    (event) => {
      pendingEventsRef.current.push({
        ...event,
        timestamp: new Date().toISOString(),
        totalPages: totalPagesRef.current,
        totalChapters: totalChaptersRef.current,
      });

      // Clear existing timeout and set new one (debounce)
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
      }

      // Flush events every 10 seconds
      flushTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          flushEvents();
        }
      }, 10000);
    },
    [flushEvents]
  );

  /**
   * Track location change (page or chapter)
   */
  const trackLocation = useCallback(
    (location) => {
      if (!bookIdRef.current || !location) return;
      const locationStr = String(location);

      // Skip if same location - don't reset time tracking
      // This prevents time from being reset when the effect re-runs with the same location
      if (currentLocationRef.current === locationStr) return;

      const now = Date.now();

      // If we have a previous location, record time spent there
      if (currentLocationRef.current && timeOnLocationRef.current > 0) {
        queueEvent({
          eventType: "time_update",
          locationType: locationTypeRef.current,
          location: currentLocationRef.current,
          timeSpent: Math.round(timeOnLocationRef.current),
          sessionId: sessionIdRef.current,
        });
      }

      // Update to new location
      currentLocationRef.current = locationStr;
      timeOnLocationRef.current = 0;
      lastUpdateTimeRef.current = now;

      // Record the location view event
      const eventType =
        locationTypeRef.current === "page" ? "page_view" : "chapter_view";
      queueEvent({
        eventType,
        locationType: locationTypeRef.current,
        location: locationStr,
        sessionId: sessionIdRef.current,
      });
    },
    [queueEvent]
  );

  /**
   * Update time tracking (call this periodically or on visibility change)
   */
  const updateTimeTracking = useCallback(() => {
    if (!isVisibleRef.current || !currentLocationRef.current) return;

    const now = Date.now();
    const elapsed = (now - lastUpdateTimeRef.current) / 1000; // Convert to seconds
    timeOnLocationRef.current += elapsed;
    lastUpdateTimeRef.current = now;
  }, []);

  /**
   * Handle session end (component unmount or page unload)
   */
  const endSession = useCallback(() => {
    // Update final time
    updateTimeTracking();

    // Record final time spent on current location
    if (currentLocationRef.current && timeOnLocationRef.current > 0) {
      pendingEventsRef.current.push({
        eventType: "time_update",
        locationType: locationTypeRef.current,
        location: currentLocationRef.current,
        timeSpent: Math.round(timeOnLocationRef.current),
        sessionId: sessionIdRef.current,
        timestamp: new Date().toISOString(),
        totalPages: totalPagesRef.current,
        totalChapters: totalChaptersRef.current,
      });
    }

    // Record session end
    pendingEventsRef.current.push({
      eventType: "session_end",
      locationType: locationTypeRef.current,
      location: currentLocationRef.current || "unknown",
      sessionEnd: new Date().toISOString(),
      sessionId: sessionIdRef.current,
      timestamp: new Date().toISOString(),
      totalPages: totalPagesRef.current,
      totalChapters: totalChaptersRef.current,
    });

    // Flush with beacon for reliable delivery
    flushEvents(true);
  }, [updateTimeTracking, flushEvents]);

  // Initialize session on mount
  useEffect(() => {
    if (!bookId) return;

    isMountedRef.current = true;
    sessionIdRef.current = generateSessionId();

    // Record session start
    queueEvent({
      eventType: "session_start",
      locationType,
      location: "start",
      sessionStart: new Date().toISOString(),
      sessionId: sessionIdRef.current,
    });

    // Handle visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is now hidden - update time and pause
        updateTimeTracking();
        isVisibleRef.current = false;
        // Flush any pending events
        flushEvents();
      } else {
        // Tab is now visible - resume tracking
        isVisibleRef.current = true;
        lastUpdateTimeRef.current = Date.now();
      }
    };

    // Handle page unload
    const handleBeforeUnload = () => {
      endSession();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Set up periodic time tracking (every 5 seconds)
    const timeTrackingInterval = setInterval(() => {
      if (isVisibleRef.current && isMountedRef.current) {
        updateTimeTracking();
      }
    }, 5000);

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      clearInterval(timeTrackingInterval);

      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
      }

      endSession();
    };
  }, [
    bookId,
    locationType,
    queueEvent,
    updateTimeTracking,
    flushEvents,
    endSession,
  ]);

  return {
    trackLocation,
    sessionId: sessionIdRef.current,
  };
}

export default useReadingAnalytics;
