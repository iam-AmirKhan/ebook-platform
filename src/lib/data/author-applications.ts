import dbConnect from "@/lib/db/mongoose";
import { requireAdmin } from "@/lib/auth/authorization";
import AuthorApplication, {
  type IAuthorApplicationSocialLink,
  type AuthorApplicationStatus,
} from "@/models/AuthorApplication";
import User from "@/models/User";
import { detectSocialPlatform } from "@/validators/author-application";

export interface UserAuthorApplicationSocialLink {
  platform: string;
  url: string;
}

export interface UserAuthorApplication {
  _id: string;
  displayName: string;
  email: string;
  phone: string;
  address: string;
  occupation: string;
  socialUrl?: string | null;
  socialLinks: UserAuthorApplicationSocialLink[];
  bio: string;
  reason: string;
  status: AuthorApplicationStatus;
  createdAt: string;
  updatedAt: string;
}

function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function getLatestAuthorApplicationForUser(
  userId: string
): Promise<UserAuthorApplication | null> {
  await dbConnect();

  const application = await AuthorApplication.findOne({ user: userId })
    .sort({ createdAt: -1 })
    .select(
      "displayName email phone address occupation socialUrl socialLinks bio reason status createdAt updatedAt"
    )
    .lean();

  if (!application) return null;

  const rawSocialUrl =
    typeof application.socialUrl === "string" && isSafeHttpUrl(application.socialUrl)
      ? application.socialUrl
      : null;

  let socialLinks = Array.isArray(application.socialLinks)
    ? application.socialLinks
        .map((link: IAuthorApplicationSocialLink) => ({
          platform: link.platform ?? "",
          url: link.url ?? "",
        }))
        .filter((link) => link.url && isSafeHttpUrl(link.url))
    : [];

  if (socialLinks.length === 0 && rawSocialUrl) {
    socialLinks = [
      {
        platform: detectSocialPlatform(rawSocialUrl),
        url: rawSocialUrl,
      },
    ];
  }

  const effectiveSocialUrl = rawSocialUrl || socialLinks[0]?.url || null;

  return {
    _id: String(application._id),
    displayName: application.displayName,
    email: application.email ?? "",
    phone: application.phone ?? "",
    address: application.address ?? "",
    occupation: application.occupation ?? "",
    socialUrl: effectiveSocialUrl,
    socialLinks,
    bio: application.bio,
    reason: application.reason,
    status: application.status,
    createdAt:
      application.createdAt instanceof Date
        ? application.createdAt.toISOString()
        : String(application.createdAt),
    updatedAt:
      application.updatedAt instanceof Date
        ? application.updatedAt.toISOString()
        : String(application.updatedAt),
  };
}

export interface AdminAuthorApplicationItem {
  _id: string;
  userId: string;
  applicantName: string;
  registeredEmail: string;
  applicantImage: string | null;
  displayName: string;
  applicationEmail: string;
  phone: string;
  address: string;
  occupation: string;
  socialUrl?: string | null;
  socialLinks: UserAuthorApplicationSocialLink[];
  bio: string;
  reason: string;
  status: AuthorApplicationStatus;
  reviewedBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAuthorApplicationCounts {
  all: number;
  pending: number;
  approved: number;
  rejected: number;
}

export interface AdminAuthorApplicationsSearchParams {
  status?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export interface AdminAuthorApplicationsResult {
  applications: AdminAuthorApplicationItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

export async function getAdminAuthorApplications(
  params: AdminAuthorApplicationsSearchParams = {}
): Promise<AdminAuthorApplicationsResult> {
  await requireAdmin();
  await dbConnect();
  // Ensure User model is loaded for population and search
  void User;

  const limit =
    typeof params.limit === "number" && params.limit > 0
      ? Math.floor(params.limit)
      : 10;
  const requestedPage =
    typeof params.page === "number" && !isNaN(params.page) && params.page > 0
      ? Math.floor(params.page)
      : 1;

  const query: Record<string, unknown> = {};

  // Status Filter
  const statusUpper = params.status?.toUpperCase();
  if (
    statusUpper === "PENDING" ||
    statusUpper === "APPROVED" ||
    statusUpper === "REJECTED"
  ) {
    query.status = statusUpper;
  }

  // Search Filter
  if (params.q?.trim()) {
    const safeQ = escapeRegex(params.q.trim());
    const regex = { $regex: safeQ, $options: "i" };

    // Search matching registered users by name or email
    const matchingUsers = await User.find({
      $or: [{ name: regex }, { email: regex }],
    })
      .select("_id")
      .lean();

    const matchingUserIds = matchingUsers.map((u) => u._id);

    query.$or = [
      { displayName: regex },
      { email: regex },
      { phone: regex },
      { occupation: regex },
      ...(matchingUserIds.length > 0 ? [{ user: { $in: matchingUserIds } }] : []),
    ];
  }

  // Calculate total matching count first to safely determine pagination bounds
  const totalCount = await AuthorApplication.countDocuments(query);
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / limit) : 1;
  const effectivePage = totalCount > 0 ? Math.min(requestedPage, totalPages) : 1;
  const skip = (effectivePage - 1) * limit;

  const rawApplications = await AuthorApplication.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate<{
      user: {
        _id: unknown;
        name?: string;
        email?: string;
        image?: string | null;
      } | null;
    }>("user", "name email image")
    .populate<{
      reviewedBy: {
        _id: unknown;
        name?: string;
        email?: string;
      } | null;
    }>("reviewedBy", "name email")
    .lean();

  const applications: AdminAuthorApplicationItem[] = rawApplications.map((app) => {
    const rawUser = app.user as {
      _id?: unknown;
      name?: string;
      email?: string;
      image?: string | null;
    } | null;

    const rawReviewer = app.reviewedBy as {
      _id?: unknown;
      name?: string;
      email?: string;
    } | null;

    const rawSocialUrl =
      typeof app.socialUrl === "string" && isSafeHttpUrl(app.socialUrl)
        ? app.socialUrl
        : null;

    let socialLinks = Array.isArray(app.socialLinks)
      ? app.socialLinks
          .map((link: IAuthorApplicationSocialLink) => ({
            platform: link.platform ?? "",
            url: link.url ?? "",
          }))
          .filter((link) => link.url && isSafeHttpUrl(link.url))
      : [];

    if (socialLinks.length === 0 && rawSocialUrl) {
      socialLinks = [
        {
          platform: detectSocialPlatform(rawSocialUrl),
          url: rawSocialUrl,
        },
      ];
    }

    const effectiveSocialUrl = rawSocialUrl || socialLinks[0]?.url || null;

    return {
      _id: String(app._id),
      userId: rawUser?._id ? String(rawUser._id) : String(app.user),
      applicantName: rawUser?.name ?? app.displayName,
      registeredEmail: rawUser?.email ?? app.email ?? "",
      applicantImage: rawUser?.image ?? null,
      displayName: app.displayName,
      applicationEmail: app.email ?? "",
      phone: app.phone ?? "",
      address: app.address ?? "",
      occupation: app.occupation ?? "",
      socialUrl: effectiveSocialUrl,
      socialLinks,
      bio: app.bio,
      reason: app.reason,
      status: app.status,
      reviewedBy: rawReviewer
        ? {
            id: String(rawReviewer._id),
            name: rawReviewer.name ?? "",
            email: rawReviewer.email ?? "",
          }
        : null,
      reviewedAt:
        app.reviewedAt instanceof Date
          ? app.reviewedAt.toISOString()
          : app.reviewedAt
          ? String(app.reviewedAt)
          : null,
      rejectionReason: app.rejectionReason ?? null,
      createdAt:
        app.createdAt instanceof Date
          ? app.createdAt.toISOString()
          : String(app.createdAt),
      updatedAt:
        app.updatedAt instanceof Date
          ? app.updatedAt.toISOString()
          : String(app.updatedAt),
    };
  });

  return {
    applications,
    totalCount,
    totalPages,
    currentPage: effectivePage,
    pageSize: limit,
  };
}

export async function getAdminAuthorApplicationCounts(): Promise<AdminAuthorApplicationCounts> {
  await requireAdmin();
  await dbConnect();

  const [all, pending, approved, rejected] = await Promise.all([
    AuthorApplication.countDocuments({}),
    AuthorApplication.countDocuments({ status: "PENDING" }),
    AuthorApplication.countDocuments({ status: "APPROVED" }),
    AuthorApplication.countDocuments({ status: "REJECTED" }),
  ]);

  return { all, pending, approved, rejected };
}

