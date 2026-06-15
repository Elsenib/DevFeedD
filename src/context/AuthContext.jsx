import { createContext } from 'react';

export const AuthContext = createContext({
  user: null,
  token: null,
  signIn: async () => {},
  signOut: () => {},
  signUp: async () => {},
  verifyEmailRegistration: async () => {},
  socialSignIn: async () => {},
  completeOnboarding: async () => {},
  updateCurrentUser: async () => {},
});
