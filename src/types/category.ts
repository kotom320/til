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

export interface BlogMeta {
  slug: string;
  title: string;
  date: string;
  summary?: string;
  description?: string;
  tags?: string[];
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
