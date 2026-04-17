export interface CategoryNode {
  name: string;
  path: string;
  children?: CategoryNode[];
  isDirectory: boolean;
  isPost?: boolean;
}

export interface PostMeta {
  title: string;
  date: string;
  category: string;
  slug: string;
  fullPath: string;
  summary?: string;
  tags?: string[];
}

export interface PostContent {
  content: string;
  frontmatter: {
    title: string;
    date: string;
    tags?: string[];
    summary?: string;
  };
}

export interface CategoryInfo {
  name: string;
  path: string;
  posts: PostMeta[];
  subcategories: CategoryInfo[];
}

export interface BlogPortfolioLink {
  /** 포트폴리오 프로젝트 slug (예: "cloudfront-optimization") */
  slug: string;
  /** 포트폴리오 프로젝트 노출용 제목 */
  title: string;
}

export interface BlogMeta {
  slug: string;
  title: string;
  date: string;
  summary?: string;
  description?: string;
  tags?: string[];
  /** 포트폴리오 동반 확장편인 경우 연결 정보 (Track A) */
  portfolio?: BlogPortfolioLink;
  /** 시리즈 포스트인 경우 (예: qaroom 시리즈) */
  series?: { name: string; order: number };
}

export interface BlogPost {
  meta: BlogMeta;
  content: string;
}

export interface SearchResult {
  post: PostMeta;
  matchedFields: {
    title?: boolean;
    content?: boolean;
    tags?: boolean;
    summary?: boolean;
  };
  relevanceScore: number;
}
