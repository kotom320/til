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
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="포스트 검색..."
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </form>

      {/* 검색 결과 */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
          {isSearching ? (
            <div className="p-4 text-center text-gray-500">검색 중...</div>
          ) : hasSearched && results.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
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
                  className="block p-3 hover:bg-gray-50 rounded-lg transition-colors"
                  onClick={() => setShowResults(false)}
                >
                  <div className="flex items-start space-x-3">
                    <FileText
                      className="flex-shrink-0 text-gray-400 mt-1"
                      size={16}
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {result.post.title}
                      </h4>
                      <div className="mt-1 flex items-center space-x-2 text-xs text-gray-500">
                        <span className="flex items-center">
                          <Calendar size={12} className="mr-1" />
                          {result.post.date}
                        </span>
                        {result.post.category && (
                          <span className="text-blue-600">
                            {result.post.category}
                          </span>
                        )}
                      </div>
                      {result.post.summary && (
                        <p className="mt-1 text-xs text-gray-600 line-clamp-2">
                          {result.post.summary}
                        </p>
                      )}
                      <div className="mt-2 flex items-center space-x-2">
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                          {getMatchedFieldText(result.matchedFields)}
                        </span>
                        {result.post.tags && result.post.tags.length > 0 && (
                          <div className="flex items-center space-x-1">
                            <Tag size={12} className="text-gray-400" />
                            {result.post.tags
                              .slice(0, 3)
                              .map((tag, tagIndex) => (
                                <span
                                  key={tagIndex}
                                  className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                            {result.post.tags.length > 3 && (
                              <span className="text-xs text-gray-400">
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
