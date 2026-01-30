import Link from "next/link";
import { HomeOutlined } from "@ant-design/icons";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-sm)",
        fontSize: 13,
        color: "var(--text-muted)",
        marginBottom: "var(--space-lg)",
      }}
    >
      <Link
        href="/"
        style={{
          display: "flex",
          alignItems: "center",
          color: "var(--text-muted)",
          transition: "color 0.2s",
        }}
      >
        <HomeOutlined />
      </Link>

      {items.map((item, index) => (
        <span key={index} style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
          <span style={{ color: "var(--border-default)" }}>/</span>
          {item.href ? (
            <Link
              href={item.href}
              style={{
                color: "var(--text-muted)",
                transition: "color 0.2s",
              }}
            >
              {item.label}
            </Link>
          ) : (
            <span style={{ color: "var(--text-secondary)" }}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
