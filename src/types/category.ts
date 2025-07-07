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
