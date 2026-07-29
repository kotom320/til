"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, X, FileText, Tag, Calendar } from "lucide-react";
import { SearchResult } from "@/types/category";

interface SearchBarProps {
  className?: string;
}

export default function SearchBar({ className = "" }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.trim().length === 0) {
      setResults([]);
      setShowResults(false);
      setHasSearched(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      await performSearch();
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  const performSearch = async () => {
    if (query.trim().length === 0) return;

    setIsSearching(true);
    setHasSearched(true);

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(query.trim())}`
      );
      if (response.ok) {
        const searchResults = await response.json();
        setResults(searchResults);
        setShowResults(true);
      } else {
        setResults([]);
        setShowResults(true);
      }
    } catch (error) {
      console.error("Search failed:", error);
      setResults([]);
      setShowResults(true);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch();
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setShowResults(false);
    setHasSearched(false);
  };

  const getMatchedFieldText = (
    matchedFields: SearchResult["matchedFields"]
  ) => {
    const fields = [];
    if (matchedFields.title) fields.push("제목");
    if (matchedFields.summary) fields.push("요약");
    if (matchedFields.tags) fields.push("태그");
    if (matchedFields.content) fields.push("내용");
    return fields.join(", ");
  };

  return (
    <div className={`relative ${className}`} ref={searchRef}>
      <form onSubmit={handleSearch} className="relative">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2"
            size={20}
            style={{ color: "var(--text-subtle)" }}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="포스트 검색..."
            className="w-full pl-10 pr-10 py-2 rounded-lg outline-none transition-colors"
            style={{
              background: "var(--bg-card)",
              color: "var(--text-body)",
              border: "1px solid var(--border-default)",
            }}
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="검색어 지우기"
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
              style={{ color: "var(--text-subtle)" }}
            >
              <X size={20} />
            </button>
          )}
        </div>
      </form>

      {/* 검색 결과 */}
      {showResults && (
        <div
          className="absolute top-full left-0 right-0 mt-2 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          {isSearching ? (
            <div
              className="p-4 text-center"
              style={{ color: "var(--text-subtle)" }}
            >
              검색 중...
            </div>
          ) : hasSearched && results.length === 0 ? (
            <div
              className="p-4 text-center"
              style={{ color: "var(--text-subtle)" }}
            >
              검색 결과가 없습니다.
            </div>
          ) : (
            <div className="p-2">
              {results.slice(0, 10).map((result, index) => (
                <Link
                  key={`${result.post.category}-${result.post.slug}-${index}`}
                  href={
                    result.post.category
                      ? `/post/${result.post.category}/${result.post.slug}`
                      : `/post/${result.post.slug}`
                  }
                  className="search-result block p-3 rounded-lg transition-colors"
                  onClick={() => setShowResults(false)}
                >
                  <div className="flex items-start space-x-3">
                    <FileText
                      className="flex-shrink-0 mt-1"
                      size={16}
                      style={{ color: "var(--text-subtle)" }}
                    />
                    <div className="flex-1 min-w-0">
                      <h4
                        className="text-sm font-medium truncate"
                        style={{ color: "var(--text-strong)" }}
                      >
                        {result.post.title}
                      </h4>
                      <div
                        className="mt-1 flex items-center space-x-2 text-xs"
                        style={{ color: "var(--text-subtle)" }}
                      >
                        <span className="flex items-center">
                          <Calendar size={12} className="mr-1" />
                          {result.post.date}
                        </span>
                        {result.post.category && (
                          <span style={{ color: "var(--accent)" }}>
                            {result.post.category}
                          </span>
                        )}
                      </div>
                      {result.post.summary && (
                        <p
                          className="mt-1 text-xs line-clamp-2"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {result.post.summary}
                        </p>
                      )}
                      <div className="mt-2 flex items-center space-x-2">
                        <span
                          className="text-xs px-2 py-1 rounded"
                          style={{
                            color: "var(--tone-success)",
                            background: "var(--tone-success-bg)",
                          }}
                        >
                          {getMatchedFieldText(result.matchedFields)}
                        </span>
                        {result.post.tags && result.post.tags.length > 0 && (
                          <div className="flex items-center space-x-1">
                            <Tag
                              size={12}
                              style={{ color: "var(--text-subtle)" }}
                            />
                            {result.post.tags
                              .slice(0, 3)
                              .map((tag, tagIndex) => (
                                <span
                                  key={tagIndex}
                                  className="text-xs px-2 py-1 rounded"
                                  style={{
                                    background: "var(--bg-muted)",
                                    color: "var(--text-muted)",
                                  }}
                                >
                                  {tag}
                                </span>
                              ))}
                            {result.post.tags.length > 3 && (
                              <span
                                className="text-xs"
                                style={{ color: "var(--text-subtle)" }}
                              >
                                +{result.post.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
