export interface Reflection {
  id: string;
  date: string; // YYYY-MM-DD
  content: string; // Markdown
  skillIds: string[]; // Skills mentioned/worked on
  mood?: 'great' | 'good' | 'okay' | 'bad';
  totalMinutes?: number; // Time logged that day
  createdAt: string;
  updatedAt: string;
}

export interface CreateReflectionInput {
  date: string;
  content: string;
  skillIds?: string[];
  mood?: Reflection['mood'];
}

export interface UpdateReflectionInput {
  id: string;
  content?: string;
  skillIds?: string[];
  mood?: Reflection['mood'];
}
