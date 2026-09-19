"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useSyncExternalStore } from "react";
import { createClient } from "../../../lib/supabase/client";
import { isAdminPath, isAnalyticsConfigured } from "../../../lib/analytics/config";
import {
  analyticsAllowed,
  readAnalyticsConsent,
  shouldAskAnalyticsConsent,
  subscribeAnalyticsConsent,
  writeAnalyticsConsent,
  type AnalyticsConsent,
} from "../../../lib/analytics/consent";
import { captureFirstTouch } from "../../../lib/analytics/firstTouch";
import {
  capturePageview,
  identifyAnalyticsUser,
  initAnalytics,
  resetAnalyticsUser,
  shutdownAnalytics,
} from "../../../lib/analytics/client";
import AnalyticsConsentBanner from "./AnalyticsConsentBanner";

function PostHogRouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const last = useRef<string>("");

  useEffect(() => {
    if (!analyticsAllowed()) return;
    const url = `${pathname}?${searchParams.toString()}`;
    if (last.current === url) return;
    last.current = url;
    void initAnalytics().then(() => {
      capturePageview(pathname);
    });
  }, [pathname, searchParams]);

  return null;
}

function PostHogAuthBridge() {
  useEffect(() => {
    if (!isAnalyticsConfigured()) return;
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!analyticsAllowed()) return;
      if (event === "SIGNED_OUT") {
        resetAnalyticsUser();
        return;
      }
      const id = session?.user?.id;
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && id) {
        void initAnalytics().then(() => identifyAnalyticsUser(id));
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return null;
}

export default function PostHogProvider() {
  const pathname = usePathname();
  const consent = useSyncExternalStore(
    subscribeAnalyticsConsent,
    readAnalyticsConsent,
    () => null
  );
  const configured = isAnalyticsConfigured();
  const admin = isAdminPath(pathname);
  const clientReady = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    captureFirstTouch();
    if (!configured || admin) return;
    if (analyticsAllowed()) {
      void initAnalytics();
    }
  }, [pathname, configured, admin, consent]);

  const onChoice = (value: AnalyticsConsent) => {
    writeAnalyticsConsent(value);
    if (value === "accepted") {
      void initAnalytics().then(async () => {
        capturePageview(pathname);
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.id) identifyAnalyticsUser(user.id);
      });
    } else {
      shutdownAnalytics();
    }
  };

  if (!configured || admin) {
    return null;
  }

  const showBanner = clientReady && shouldAskAnalyticsConsent();

  return (
    <>
      <Suspense fallback={null}>
        <PostHogRouteTracker />
      </Suspense>
      <PostHogAuthBridge />
      {showBanner ? <AnalyticsConsentBanner onChoice={onChoice} /> : null}
    </>
  );
}
