// Type augmentation to add `id` to the NextAuth Session's user object.
// The `id` is injected via the `session` callback in route.tsx,
// but NextAuth's default types don't include it. This declaration
// tells TypeScript about the extended shape so server actions can
// safely access session.user.id without casting.

import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
