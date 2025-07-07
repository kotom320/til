import Link from "next/link";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  baseUrl,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      // 모든 페이지 표시
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 현재 페이지 주변의 페이지들만 표시
      const start = Math.max(1, currentPage - 2);
      const end = Math.min(totalPages, currentPage + 2);

      if (start > 1) {
        pages.push(1);
        if (start > 2) {
          pages.push("...");
        }
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages) {
        if (end < totalPages - 1) {
          pages.push("...");
        }
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <nav className="flex items-center justify-center space-x-1 mt-8">
      {/* 이전 페이지 */}
      {currentPage > 1 && (
        <Link
          href={`${baseUrl}?page=${currentPage - 1}`}
          className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-700 transition-colors"
        >
          <ChevronLeft size={16} className="mr-1" />
          이전
        </Link>
      )}

      {/* 페이지 번호들 */}
      {pageNumbers.map((page, index) => {
        if (page === "...") {
          return (
            <span
              key={`ellipsis-${index}`}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-500"
            >
              <MoreHorizontal size={16} />
            </span>
          );
        }

        const pageNum = page as number;
        const isCurrent = pageNum === currentPage;

        return (
          <Link
            key={pageNum}
            href={`${baseUrl}?page=${pageNum}`}
            className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              isCurrent
                ? "bg-blue-600 text-white border border-blue-600"
                : "text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-700"
            }`}
          >
            {pageNum}
          </Link>
        );
      })}

      {/* 다음 페이지 */}
      {currentPage < totalPages && (
        <Link
          href={`${baseUrl}?page=${currentPage + 1}`}
          className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-700 transition-colors"
        >
          다음
          <ChevronRight size={16} className="ml-1" />
        </Link>
      )}
    </nav>
  );
}
