import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    userRole?: 'admin' | 'team_lead' | 'csm';
    oauthFlow?: 'login' | 'signup';
  }
}