import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getCurrentUser, signOut } from "../services/authService";
import { getOnboardingStatus } from "../services/userDetailsService";

const AppContext = createContext(null);

/** Pick active mailbox — prefers explicit selection, then backend default, then first connected. */
const resolveActiveMailbox = (connectedMailboxes, preferredEmail, defaultEmail) => {
  const withAddress = (connectedMailboxes || []).filter((m) => m.mailboxEmail);
  if (!withAddress.length) return "";

  if (preferredEmail) {
    const match = withAddress.find((m) => m.mailboxEmail === preferredEmail);
    if (match) return match.mailboxEmail;
  }

  if (defaultEmail) {
    const match = withAddress.find((m) => m.mailboxEmail === defaultEmail);
    if (match) return match.mailboxEmail;
  }

  const flaggedDefault = withAddress.find((m) => m.isDefaultMailbox);
  if (flaggedDefault) return flaggedDefault.mailboxEmail;

  return withAddress[0].mailboxEmail;
};

const extractDefaultMailboxEmail = (res, mailboxes) =>
  res?.defaultMailboxEmail ||
  res?.profile?.defaultMailboxEmail ||
  mailboxes.find((m) => m.isDefaultMailbox)?.mailboxEmail ||
  mailboxes[0]?.mailboxEmail ||
  "";

export const AppProvider = ({ children }) => {
  const [user, setUserState] = useState(null);
  /** Primary UserDetails record — profile, onboarding, messaging (isPrimary: true). */
  const [primaryProfile, setPrimaryProfile] = useState(null);
  /** Connected mailbox records — separate docs per Gmail/Outlook account. */
  const [connectedMailboxes, setConnectedMailboxes] = useState([]);
  const [onboarding, setOnboarding] = useState(null);
  const [selectedMailboxEmail, setSelectedMailboxEmail] = useState("");
  const [defaultMailboxEmail, setDefaultMailboxEmail] = useState("");
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);

  const authEmail = user?.email || "";
  const activeMailboxEmail = resolveActiveMailbox(
    connectedMailboxes,
    selectedMailboxEmail,
    defaultMailboxEmail,
  );
  const userEmail =
    onboarding?.emailConnected && activeMailboxEmail ? activeMailboxEmail : "";

  const applyOnboardingPayload = useCallback((res, keepSelection = true) => {
    const list = res.mailboxes || [];
    const defaultEmail = extractDefaultMailboxEmail(res, list);

    setOnboarding(res.onboarding || null);
    setConnectedMailboxes(list);
    setPrimaryProfile(res.profile || (res.data?.isPrimary ? res.data : null));
    setDefaultMailboxEmail(defaultEmail);
    setSelectedMailboxEmail((prev) => {
      if (!keepSelection) return resolveActiveMailbox(list, "", defaultEmail);
      return resolveActiveMailbox(list, prev, defaultEmail);
    });
  }, []);

  const refreshUserDetails = useCallback(async (userId, keepSelection = true) => {
    const id = userId || user?._id;
    if (!id) {
      setPrimaryProfile(null);
      setConnectedMailboxes([]);
      setOnboarding(null);
      setSelectedMailboxEmail("");
      setDefaultMailboxEmail("");
      return null;
    }

    try {
      const res = await getOnboardingStatus(id);
      applyOnboardingPayload(res, keepSelection);
      return res;
    } catch {
      setPrimaryProfile(null);
      setConnectedMailboxes([]);
      setOnboarding(null);
      setSelectedMailboxEmail("");
      setDefaultMailboxEmail("");
      return null;
    }
  }, [user?._id, applyOnboardingPayload]);

  const bootstrapSession = useCallback(async () => {
    setInitializing(true);
    try {
      const res = await getCurrentUser();
      setUserState(res.data);
      await refreshUserDetails(res.data._id, false);
    } catch {
      setUserState(null);
      setPrimaryProfile(null);
      setConnectedMailboxes([]);
      setOnboarding(null);
      setSelectedMailboxEmail("");
      setDefaultMailboxEmail("");
    } finally {
      setInitializing(false);
    }
  }, [refreshUserDetails]);

  useEffect(() => {
    bootstrapSession();
  }, [bootstrapSession]);

  const setUser = (userData) => {
    setUserState(userData);
    if (userData?._id) {
      refreshUserDetails(userData._id, false);
    } else {
      setPrimaryProfile(null);
      setConnectedMailboxes([]);
      setOnboarding(null);
      setSelectedMailboxEmail("");
      setDefaultMailboxEmail("");
    }
  };

  const logout = async () => {
    try {
      await signOut();
    } catch {
      // Clear local state even if the request fails
    }
    setUserState(null);
    setPrimaryProfile(null);
    setConnectedMailboxes([]);
    setOnboarding(null);
    setSelectedMailboxEmail("");
    setDefaultMailboxEmail("");
  };

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        authEmail,
        userEmail,
        mailboxEmail: activeMailboxEmail,
        selectedMailboxEmail: activeMailboxEmail,
        setSelectedMailboxEmail,
        defaultMailboxEmail,
        primaryProfile,
        userDetails: primaryProfile,
        connectedMailboxes,
        mailboxes: connectedMailboxes,
        onboarding,
        refreshUserDetails,
        applyOnboardingPayload,
        logout,
        loading,
        setLoading,
        initializing,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};
