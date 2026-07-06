export type AuthUser = {
  id: string;
  email?: string;
};

export type AuthSession = {
  user: AuthUser | null;
} | null;

export type AuthSubscription = {
  unsubscribe: () => void;
};
