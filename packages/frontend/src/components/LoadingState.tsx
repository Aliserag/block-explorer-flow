import { Spin } from "antd";
import { motion } from "framer-motion";

interface LoadingStateProps {
  message?: string;
}

export default function LoadingState({ message = "Loading..." }: LoadingStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-3xl)",
        gap: "var(--space-lg)",
      }}
    >
      <Spin size="large" />
      <div style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{message}</div>
    </motion.div>
  );
}
