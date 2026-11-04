import React, { createContext, useContext, useState, useEffect } from "react";
import { ethers } from "ethers";
import api from "../services/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("chainkyc_token") || null);
  const [loading, setLoading] = useState(true);

  // Sync user profile on mount
  useEffect(() => {
    async function fetchMe() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get("/auth/me");
        setUser(res.data.user);
      } catch (err) {
        console.error("Failed to load user profile:", err);
        setToken(null);
        setUser(null);
        localStorage.removeItem("chainkyc_token");
      } finally {
        setLoading(false);
      }
    }
    fetchMe();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    const { token: receivedToken, user: receivedUser } = res.data;
    localStorage.setItem("chainkyc_token", receivedToken);
    setToken(receivedToken);
    setUser(receivedUser);
    return receivedUser;
  };

  const register = async (name, email, password) => {
    const res = await api.post("/auth/register", { name, email, password });
    const { token: receivedToken, user: receivedUser } = res.data;
    localStorage.setItem("chainkyc_token", receivedToken);
    setToken(receivedToken);
    setUser(receivedUser);
    return receivedUser;
  };

  const getWalletProof = async () => {
    if (!window.ethereum) {
      throw new Error("MetaMask is not installed. Please install MetaMask first.");
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    if (!accounts[0]) throw new Error("No wallet account was selected.");

    const walletAddress = ethers.getAddress(accounts[0]);
    const challengeResponse = await api.post("/auth/wallet/challenge", { walletAddress });
    const signer = await provider.getSigner();
    const signature = await signer.signMessage(challengeResponse.data.message);

    return {
      walletAddress,
      nonce: challengeResponse.data.nonce,
      signature,
    };
  };

  const linkWallet = async () => {
    const proof = await getWalletProof();
    const res = await api.post("/auth/wallet/link", proof);
    setUser(res.data.user);
    return res.data.user;
  };

  const walletLogin = async () => {
    const proof = await getWalletProof();
    const res = await api.post("/auth/wallet/login", proof);
    const { token: receivedToken, user: receivedUser } = res.data;
    localStorage.setItem("chainkyc_token", receivedToken);
    setToken(receivedToken);
    setUser(receivedUser);
    return receivedUser;
  };

  const logout = () => {
    localStorage.removeItem("chainkyc_token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        linkWallet,
        walletLogin,
        logout,
        isAdmin: user?.role === "ADMIN",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
