"use client";

import { createContext, useContext, type ReactNode } from "react";
import { type NetworkId, getChainId } from "@/lib/chains";

interface NetworkContextValue {
  network: NetworkId;
  chainId: number;
  isTestnet: boolean;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

interface NetworkProviderProps {
  network: NetworkId;
  children: ReactNode;
}

export function NetworkProvider({ network, children }: NetworkProviderProps) {
  const value: NetworkContextValue = {
    network,
    chainId: getChainId(network),
    isTestnet: network === "testnet",
  };

  return (
    <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>
  );
}

export function useNetwork(): NetworkContextValue {
  const context = useContext(NetworkContext);
  if (!context) {
    // Default to mainnet if no provider (for backwards compatibility)
    return {
      network: "mainnet",
      chainId: 747,
      isTestnet: false,
    };
  }
  return context;
}
