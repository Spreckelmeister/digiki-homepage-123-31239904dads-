export interface Profile {
  id: string;
  full_name: string;
  school: string;
  role: "teacher" | "admin";
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface BestPractice {
  id: string;
  title: string;
  school_name: string;
  subject: string;
  grade_level: string;
  tools_used: string[];
  summary: string;
  content: string;
  author_id: string;
  published: boolean;
  created_at: string;
  updated_at: string;
  profiles?: { full_name: string };
  best_practice_categories?: { categories: Category }[];
}
