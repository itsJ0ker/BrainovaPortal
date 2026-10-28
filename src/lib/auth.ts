import { cookies, headers } from "next/headers";
import { AuthUser, UserRole } from "@/types";

export const DEV_ROLES: Record<string, AuthUser> = {
  super_admin: {
    userId: "dev_super_admin_1",
    email: "superadmin@schexamport.internal",
    name: "Platform Super Admin",
    role: "super_admin",
  },
  school_admin: {
    userId: "dev_school_admin_1",
    email: "admin@greenwood.edu",
    name: "Dr. Eleanor Vance",
    role: "school_admin",
    schoolId: "67bc98124501a35123456789", // Will match seeded Greenwood High
    schoolSlug: "greenwood-high",
  },
  teacher: {
    userId: "dev_teacher_1",
    email: "teacher@greenwood.edu",
    name: "Marcus Brody",
    role: "teacher",
    schoolId: "67bc98124501a35123456789",
    schoolSlug: "greenwood-high",
  },
};

let mockCurrentUser: AuthUser | null | undefined = undefined;

export function setMockCurrentUser(user: AuthUser | null | undefined) {
  mockCurrentUser = user;
}

/**
 * Retrieves the currently authenticated user.
 * Supports Clerk authentication in production, with fallback to DevAuth / cookie selector.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  if (mockCurrentUser !== undefined) {
    return mockCurrentUser;
  }

  let cookieStore: any = null;
  try {
    cookieStore = await cookies();
  } catch {
    // Outside Next.js request scope (e.g. testing or background worker)
  }

  // Check for direct School Administrator JWT session cookie first
  if (cookieStore) {
    try {
      const schoolSessionCookie = cookieStore.get("school_session")?.value;
      if (schoolSessionCookie) {
        const { verifySchoolSession } = await import("@/lib/session");
        const session = verifySchoolSession(schoolSessionCookie);
        if (session) {
          return {
            userId: `school_${session.schoolId}`,
            email: session.email,
            name: session.name || "School Administrator",
            role: "school_admin",
            schoolId: session.schoolId,
            schoolSlug: session.schoolSlug,
          };
        }
        // If a school session cookie was provided but is invalid or tampered, explicitly reject!
        return null;
      }
    } catch (err) {
      // Continue
    }
  }

  // Check for Clerk if credentials are provided in env (Super Admin auth)
  const isClerkConfigured = Boolean(
    process.env.CLERK_SECRET_KEY &&
    !process.env.CLERK_SECRET_KEY.includes("your_") &&
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("your_")
  );

  if (isClerkConfigured) {
    try {
      const { auth, currentUser } = await import("@clerk/nextjs/server");
      const clerkAuth = await auth();
      if (clerkAuth.userId) {
        const user = await currentUser();
        const userEmail = (user?.emailAddresses?.[0]?.emailAddress || "").toLowerCase();

        let role = ((clerkAuth.sessionClaims?.metadata as any)?.role ||
          user?.publicMetadata?.role ||
          "super_admin") as UserRole;
        let schoolId = ((clerkAuth.sessionClaims?.metadata as any)?.schoolId ||
          user?.publicMetadata?.schoolId ||
          null) as string | null;
        let schoolSlug = ((clerkAuth.sessionClaims?.metadata as any)?.schoolSlug ||
          user?.publicMetadata?.schoolSlug ||
          null) as string | null;

        // Auto-match school by adminEmail or adminClerkId from MongoDB
        if (userEmail) {
          try {
            const { connectDB } = await import("@/lib/db");
            const { School } = await import("@/models/School");
            await connectDB();
            const schoolDoc = await School.findOne({
              $or: [
                { adminEmail: userEmail },
                { adminClerkId: clerkAuth.userId },
              ],
            });

            if (schoolDoc) {
              role = "school_admin";
              schoolId = schoolDoc._id.toString();
              schoolSlug = schoolDoc.slug;

              // Link clerk ID if not already saved
              if (!schoolDoc.adminClerkId) {
                schoolDoc.adminClerkId = clerkAuth.userId;
                await schoolDoc.save();
              }
            }
          } catch (dbErr) {
            console.error("Auth DB school lookup error:", dbErr);
          }
        }

        return {
          userId: clerkAuth.userId,
          email: userEmail || "user@clerk.local",
          name: `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Administrator",
          role,
          schoolId,
          schoolSlug,
        };
      }

      // Explicitly return null if Clerk is configured and user is unauthenticated
      return null;
    } catch (err) {
      // If error occurs communicating with Clerk, continue to dev fallback
    }
  }

  // Dev / Testing Auth from Cookie or Header
  if (cookieStore) {
    try {
      const devRoleCookie = cookieStore.get("dev_auth_role")?.value;
      const devSchoolIdCookie = cookieStore.get("dev_auth_school_id")?.value;
      const devSchoolSlugCookie = cookieStore.get("dev_auth_school_slug")?.value;

      if (devRoleCookie) {
        if (devRoleCookie === "none" || devRoleCookie === "unauthenticated") {
          return null;
        }
        if (DEV_ROLES[devRoleCookie]) {
          const base = DEV_ROLES[devRoleCookie];
          return {
            ...base,
            schoolId: devSchoolIdCookie || base.schoolId,
            schoolSlug: devSchoolSlugCookie || base.schoolSlug,
          };
        }
        return null;
      }
    } catch {
      // Continue
    }
  }

  // In production, unauthenticated requests must NEVER default to Super Admin
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  // Default to Super Admin for frictionless local demonstration across both consoles
  return DEV_ROLES.super_admin;
}

/**
 * Enforces Super Admin privileges. Throws error if unauthorized.
 */
export async function requireSuperAdmin(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== "super_admin") {
    throw new Error("UNAUTHORIZED: Super Admin access required.");
  }
  return user;
}

/**
 * Enforces School Admin or Staff access to a specific school workspace.
 * Prevents cross-tenant access.
 */
export async function requireSchoolAccess(schoolIdOrSlug: string): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED: Authentication required.");
  }

  // Super Admin can inspect any school
  if (user.role === "super_admin") {
    return user;
  }

  // Check matching schoolId or schoolSlug
  const matches =
    (user.schoolId && user.schoolId.toString() === schoolIdOrSlug.toString()) ||
    (user.schoolSlug && user.schoolSlug === schoolIdOrSlug);

  if (!matches) {
    throw new Error("FORBIDDEN: You do not have permission to access this school's records.");
  }

  return user;
}
