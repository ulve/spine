export interface Author {
  id: string;
  name: string;
  picture?: string | null;
}

export interface Series {
  id: string;
  name: string;
}

export interface Tag {
  id: string;
  name: string;
}

export interface User {
  id: string;
  username: string;
  isAdmin: boolean;
  isApproved: boolean;
  createdAt: string;
}

export interface ReadingStatus {
  id: string;
  userId: string;
  bookId: string;
  status: 'PLAN_TO_READ' | 'READING' | 'FINISHED' | 'ABANDONED';
  progress: number;
  updatedAt: string;
}

export interface Review {
  id: string;
  userId: string;
  bookId: string;
  rating: number | null;
  comment: string | null;
  createdAt: string;
  user?: {
    username: string;
  };
}

export interface Shelf {
  id: string;
  name: string;
  userId: string;
  _count?: {
    books: number;
  };
}

export interface Book {
  id: string;
  title: string;
  filePath: string;
  format: string;
  addedDate: string;
  coverPath: string | null;
  description: string | null;
  goodreadsLink: string | null;
  authors: Author[];
  series: Series | null;
  seriesId: string | null;
  seriesNumber: number | null;
  tags: Tag[];
  statuses?: ReadingStatus[];
  reviews?: Review[];
}

export interface NavShelf {
  id: string;
  name: string;
  backgroundImage: string | null;
  order: number;
  tags: Tag[];
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface BooksResponse {
  books: Book[];
  pagination: PaginationInfo;
}
