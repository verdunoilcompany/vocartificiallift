export interface UserResponse {
  username: string;
  authenticated: boolean;
  source: string;
  error?: string;
}
