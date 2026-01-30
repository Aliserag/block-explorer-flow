"use client";

import { Button, Input, Space } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  DoubleLeftOutlined,
  LeftOutlined,
  RightOutlined,
  DoubleRightOutlined,
} from "@ant-design/icons";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
  pageSize?: number;
}

export default function Pagination({
  currentPage,
  totalPages,
  baseUrl,
  pageSize = 25,
}: PaginationProps) {
  const router = useRouter();
  const [jumpValue, setJumpValue] = useState("");

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    const url = new URL(baseUrl, window.location.origin);
    url.searchParams.set("page", page.toString());
    url.searchParams.set("pageSize", pageSize.toString());
    router.push(url.pathname + url.search);
  };

  const handleJump = () => {
    const page = parseInt(jumpValue);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      goToPage(page);
      setJumpValue("");
    }
  };

  const getVisiblePages = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const visiblePages = getVisiblePages();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "var(--space-md)",
        padding: "var(--space-lg) 0",
      }}
    >
      <Space size="small">
        <Button
          icon={<DoubleLeftOutlined />}
          onClick={() => goToPage(1)}
          disabled={currentPage === 1}
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border-subtle)",
            color: "var(--text-secondary)",
          }}
        />
        <Button
          icon={<LeftOutlined />}
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border-subtle)",
            color: "var(--text-secondary)",
          }}
        />

        {visiblePages[0] > 1 && (
          <span style={{ color: "var(--text-muted)", padding: "0 4px" }}>...</span>
        )}

        {visiblePages.map((page) => (
          <Button
            key={page}
            onClick={() => goToPage(page)}
            style={{
              background: page === currentPage ? "var(--flow-green)" : "var(--bg-card)",
              borderColor: page === currentPage ? "var(--flow-green)" : "var(--border-subtle)",
              color: page === currentPage ? "var(--bg-primary)" : "var(--text-secondary)",
              fontWeight: page === currentPage ? 600 : 400,
              fontFamily: "var(--font-mono)",
            }}
          >
            {page}
          </Button>
        ))}

        {visiblePages[visiblePages.length - 1] < totalPages && (
          <span style={{ color: "var(--text-muted)", padding: "0 4px" }}>...</span>
        )}

        <Button
          icon={<RightOutlined />}
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border-subtle)",
            color: "var(--text-secondary)",
          }}
        />
        <Button
          icon={<DoubleRightOutlined />}
          onClick={() => goToPage(totalPages)}
          disabled={currentPage === totalPages}
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border-subtle)",
            color: "var(--text-secondary)",
          }}
        />
      </Space>

      <Space>
        <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Go to page:</span>
        <Input
          value={jumpValue}
          onChange={(e) => setJumpValue(e.target.value)}
          onPressEnter={handleJump}
          placeholder={`1-${totalPages}`}
          style={{
            width: 80,
            fontFamily: "var(--font-mono)",
            background: "var(--bg-card)",
            borderColor: "var(--border-subtle)",
          }}
        />
        <Button
          onClick={handleJump}
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border-subtle)",
            color: "var(--text-secondary)",
          }}
        >
          Go
        </Button>
      </Space>
    </div>
  );
}
