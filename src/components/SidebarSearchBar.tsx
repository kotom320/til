"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, X, FileText } from "lucide-react";
import { SearchResult } from "@/types/category";

interface SidebarSearchBarProps {
  className?: string;
}

export default function SidebarSearchBar({
  className = "",
}: SidebarSearchBarProps) {
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

  return (
    <div className={`relative ${className}`} ref={searchRef}>
      <form onSubmit={handleSearch} className="relative">
        <div className="relative">
          <Search
            className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={16}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="검색..."
            className="w-full pl-8 pr-8 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-transparent outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </form>

      {/* 검색 결과 - 사이드바용 간단한 형태 */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-y-auto z-50">
          {isSearching ? (
            <div className="p-3 text-center text-xs text-gray-500">
              검색 중...
            </div>
          ) : hasSearched && results.length === 0 ? (
            <div className="p-3 text-center text-xs text-gray-500">
              결과 없음
            </div>
          ) : (
            <div className="py-1">
              {results.slice(0, 12).map((result, index) => (
                <Link
                  key={`${result.post.category}-${result.post.slug}-${index}`}
                  href={
                    result.post.category
                      ? `/post/${result.post.category}/${result.post.slug}`
                      : `/post/${result.post.slug}`
                  }
                  className="block px-3 py-2 hover:bg-gray-50 text-sm"
                  onClick={() => setShowResults(false)}
                >
                  <div className="flex items-center space-x-2">
                    <FileText
                      className="flex-shrink-0 text-gray-400"
                      size={14}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-gray-900 truncate font-medium">
                        {result.post.title}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {result.post.category}
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
