import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { Tag, Tabs } from "antd";
import { motion } from "framer-motion";
import { getAccount } from "@/services/api";
import { useNetwork } from "@/hooks/useNetwork";
import DataField from "@/components/DataField";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";

export default function AccountDetail() {
  const { address } = useParams<{ address: string }>();
  const { network } = useNetwork();

  const { data: account, isLoading, isError } = useQuery({
    queryKey: ["account", network, address],
    queryFn: () => getAccount(address!, network),
    enabled: !!address,
  });

  if (isLoading) return <LoadingState message="Loading account..." />;
  if (isError || !account) return <ErrorState title="Account Not Found" message={`Could not load account ${address?.slice(0, 20)}...`} />;

  return (
    <div className="container">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: "var(--space-xl)" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", marginBottom: "var(--space-sm)" }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>
            {account.isContract ? "Contract" : "Account"}
          </h1>
          {account.isContract ? (
            <Tag color="purple">Contract</Tag>
          ) : (
            <Tag color="blue">EOA</Tag>
          )}
        </div>
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: 13,
            fontFamily: "var(--font-mono)",
            wordBreak: "break-all",
          }}
        >
          {account.address}
        </p>
      </motion.div>

      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          background: "linear-gradient(135deg, var(--flow-green) 0%, var(--flow-green-dark) 100%)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-xl)",
          marginBottom: "var(--space-xl)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "rgba(255,255,255,0.8)",
              marginBottom: "var(--space-xs)",
            }}
          >
            Balance
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
              color: "white",
            }}
          >
            {parseFloat(account.balanceFormatted).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 6,
            })}{" "}
            <span style={{ fontSize: 20, opacity: 0.8 }}>FLOW</span>
          </div>
        </div>
        <div
          style={{
            width: 64,
            height: 64,
            background: "rgba(255,255,255,0.2)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" />
            <path d="M12 6V18M18 12H6" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      </motion.div>

      {/* Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-lg)",
          marginBottom: "var(--space-xl)",
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: "var(--space-md)", color: "var(--text-primary)" }}>
          Account Details
        </h3>
        <DataField label="Address" value={account.address} mono copyable />
        <DataField label="Balance (wei)" value={account.balance} mono />
        <DataField label="Transaction Count" value={account.transactionCount} />
        <DataField label="Type" value={account.isContract ? "Smart Contract" : "Externally Owned Account (EOA)"} />
      </motion.div>

      {/* Contract Code */}
      {account.isContract && account.code && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
          }}
        >
          <Tabs
            defaultActiveKey="code"
            items={[
              {
                key: "code",
                label: "Contract Bytecode",
                children: (
                  <div style={{ padding: "var(--space-lg)" }}>
                    <div
                      style={{
                        background: "var(--bg-secondary)",
                        borderRadius: "var(--radius-md)",
                        padding: "var(--space-md)",
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: "var(--text-secondary)",
                        wordBreak: "break-all",
                        maxHeight: 400,
                        overflow: "auto",
                      }}
                    >
                      {account.code}
                    </div>
                  </div>
                ),
              },
            ]}
          />
        </motion.div>
      )}
    </div>
  );
}
