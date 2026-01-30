import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { chains, defaultNetwork, type NetworkId } from "@/config/chains";

interface NetworkContextValue {
  network: NetworkId;
  setNetwork: (network: NetworkId) => void;
  chain: typeof chains[NetworkId];
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [network, setNetworkState] = useState<NetworkId>(() => {
    const stored = localStorage.getItem("flow-explorer-network");
    return (stored === "testnet" ? "testnet" : defaultNetwork) as NetworkId;
  });

  const setNetwork = useCallback((newNetwork: NetworkId) => {
    setNetworkState(newNetwork);
    localStorage.setItem("flow-explorer-network", newNetwork);
  }, []);

  const value: NetworkContextValue = {
    network,
    setNetwork,
    chain: chains[network],
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error("useNetwork must be used within a NetworkProvider");
  }
  return context;
}
