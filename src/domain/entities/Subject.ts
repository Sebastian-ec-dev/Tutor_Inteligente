export type Subject = {
  id: string;
  name: string;
  userId: string;
  teacher?: string | null;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  createdAt?: string;
};

export type NewSubject = {
  name: string;
  userId: string;
  teacher?: string;
  description?: string;
  color?: string;
  icon?: string;
};

export type UpdateSubject = {
  id: string;
  name: string;
  teacher?: string;
  description?: string;
  color?: string;
  icon?: string;
};
