export type UserProfile = {
  id: string;
  email?: string | null;
  displayName?: string | null;
  university?: string | null;
  createdAt?: string | null;
};

export type UpdateProfileInput = {
  displayName?: string;
  university?: string;
};
