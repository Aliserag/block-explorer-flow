"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { message } from "antd";
import { SearchOutlined, LoadingOutlined, CloseCircleFilled } from "@ant-design/icons";

interface SearchBarProps {
  className?: string;
  size?: "default" | "large";
  placeholder?: string;
}

export default function SearchBar({
  className = "",
  size = "default",
  placeholder = "Search by address, tx hash, or block...",
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    const q = query.trim();

    try {
      if (/^0x[a-fA-F0-9]{64}$/.test(q)) {
        router.push(`/tx/${q}`);
      } else if (/^0x[a-fA-F0-9]{40}$/.test(q)) {
        router.push(`/account/${q}`);
      } else if (/^\d+$/.test(q)) {
        router.push(`/block/${q}`);
      } else {
        message.warning("Invalid search query");
        setIsSearching(false);
        return;
      }
      setQuery("");
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
    if (e.key === "Escape") {
      setQuery("");
      inputRef.current?.blur();
    }
  };

  const clearSearch = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  // Keyboard shortcut: Cmd/Ctrl + K to focus search
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  const isLarge = size === "large";

  return (
    <>
      <div
        className={`search-bar-wrapper ${isFocused ? "focused" : ""} ${className}`}
        style={{
          position: "relative",
          width: "100%",
        }}
      >
        {/* Glow effect behind the search bar */}
        <div
          className="search-glow"
          style={{
            position: "absolute",
            inset: -2,
            borderRadius: isLarge ? 16 : 12,
            background: `linear-gradient(135deg, var(--flow-green) 0%, transparent 50%, var(--flow-green-dark) 100%)`,
            opacity: isFocused ? 0.4 : 0,
            filter: "blur(8px)",
            transition: "opacity 0.3s ease",
            pointerEvents: "none",
          }}
        />

        {/* Main search container */}
        <div
          className="search-container"
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: isLarge ? "14px 20px" : "10px 16px",
            background: isFocused
              ? "rgba(26, 26, 29, 0.95)"
              : "rgba(17, 17, 19, 0.8)",
            border: `1px solid ${isFocused ? "var(--flow-green)" : "var(--border-subtle)"}`,
            borderRadius: isLarge ? 14 : 10,
            backdropFilter: "blur(20px)",
            boxShadow: isFocused
              ? "0 0 0 3px rgba(0, 239, 139, 0.1), 0 8px 32px rgba(0, 0, 0, 0.4)"
              : "0 4px 16px rgba(0, 0, 0, 0.2)",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {/* Search icon with animation */}
          <div
            className="search-icon"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: isLarge ? 24 : 20,
              height: isLarge ? 24 : 20,
              color: isFocused ? "var(--flow-green)" : "var(--text-muted)",
              transition: "all 0.3s ease",
              transform: isFocused ? "scale(1.1)" : "scale(1)",
            }}
          >
            {isSearching ? (
              <LoadingOutlined style={{ fontSize: isLarge ? 20 : 16 }} spin />
            ) : (
              <SearchOutlined style={{ fontSize: isLarge ? 20 : 16 }} />
            )}
          </div>

          {/* Input field */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text-primary)",
              fontSize: isLarge ? 16 : 14,
              fontFamily: "var(--font-mono)",
              letterSpacing: "-0.01em",
              caretColor: "var(--flow-green)",
            }}
          />

          {/* Clear button */}
          {query && (
            <button
              onClick={clearSearch}
              className="clear-button"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 4,
                color: "var(--text-muted)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
            >
              <CloseCircleFilled style={{ fontSize: isLarge ? 18 : 16 }} />
            </button>
          )}

          {/* Keyboard shortcut hint */}
          {!query && !isFocused && (
            <div
              className="keyboard-hint"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 8px",
                background: "var(--bg-tertiary)",
                borderRadius: 6,
                border: "1px solid var(--border-subtle)",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-muted)",
                  fontWeight: 500,
                }}
              >
                ⌘K
              </span>
            </div>
          )}

          {/* Search button */}
          {query && (
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="search-button"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: isLarge ? "8px 16px" : "6px 12px",
                background: "linear-gradient(135deg, var(--flow-green) 0%, var(--flow-green-dark) 100%)",
                border: "none",
                borderRadius: 8,
                cursor: isSearching ? "not-allowed" : "pointer",
                color: "var(--bg-primary)",
                fontSize: isLarge ? 14 : 12,
                fontWeight: 600,
                transition: "all 0.2s ease",
                opacity: isSearching ? 0.7 : 1,
              }}
            >
              {isSearching ? "..." : "Search"}
            </button>
          )}
        </div>

        {/* Animated border gradient */}
        {isFocused && (
          <div
            className="border-gradient"
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: isLarge ? 14 : 10,
              padding: 1,
              background: `linear-gradient(135deg, var(--flow-green), var(--flow-green-dark), var(--flow-green))`,
              backgroundSize: "200% 200%",
              animation: "borderShift 3s ease infinite",
              pointerEvents: "none",
              mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              maskComposite: "xor",
              WebkitMaskComposite: "xor",
            }}
          />
        )}
      </div>

      <style jsx global>{`
        @keyframes borderShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .search-bar-wrapper input::placeholder {
          color: var(--text-muted);
          opacity: 0.7;
          transition: opacity 0.2s ease;
        }

        .search-bar-wrapper.focused input::placeholder {
          opacity: 0.5;
        }

        .search-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 239, 139, 0.3);
        }

        .search-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .keyboard-hint {
          opacity: 0.6;
          transition: opacity 0.2s ease;
        }

        .search-bar-wrapper:hover .keyboard-hint {
          opacity: 1;
        }

        /* Pulse animation for the glow when focused */
        .search-bar-wrapper.focused .search-glow {
          animation: glowPulse 2s ease-in-out infinite;
        }

        @keyframes glowPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </>
  );
}
