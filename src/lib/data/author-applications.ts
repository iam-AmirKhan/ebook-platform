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

import Author from "@/models/Author";
import mongoose, { Types } from "mongoose";

export interface AdminAuthorApplicationItem {
  _id: string;
  applicationId?: string | null;
  authorId?: string | null;
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
  isAuthorActive?: boolean;
  isAuthorHidden?: boolean;
  isAuthorRejected?: boolean;
  hasApplication: boolean;
  isOrphaned?: boolean;
  userRole?: string;
  hiddenAt?: string | null;
  rejectedAt?: string | null;
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
  hidden: number;
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

interface PopulatedUser {
  _id?: unknown;
  name?: string;
  email?: string;
  image?: string | null;
  role?: string;
}

interface RawAuthorDoc {
  _id?: unknown;
  user?: unknown | PopulatedUser;
  penName?: string;
  slug?: string;
  bio?: string | null;
  profileImage?: string | null;
  status?: string;
  hiddenAt?: Date | string | null;
  hiddenBy?: unknown;
  rejectedAt?: Date | string | null;
  rejectedBy?: unknown;
  rejectionReason?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

interface RawAppDoc {
  _id?: unknown;
  user?: unknown | PopulatedUser;
  displayName?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  occupation?: string | null;
  socialUrl?: string | null;
  socialLinks?: IAuthorApplicationSocialLink[];
  bio?: string;
  reason?: string;
  status?: AuthorApplicationStatus;
  reviewedBy?: unknown;
  reviewedAt?: Date | string | null;
  rejectionReason?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

async function fetchUserMapForDocs(
  docs: Array<{ user?: unknown }>
): Promise<Map<string, PopulatedUser>> {
  const userIds = docs
    .map((d) => (d.user ? String(d.user) : null))
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  if (userIds.length === 0) return new Map();

  const validObjectIds = userIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  const users = (await User.find({
    $or: [
      ...(validObjectIds.length > 0 ? [{ _id: { $in: validObjectIds } }] : []),
      { _id: { $in: userIds } },
    ],
  })
    .select("name email image role")
    .lean()) as unknown as PopulatedUser[];

  const map = new Map<string, PopulatedUser>();
  for (const u of users) {
    if (u._id) {
      map.set(String(u._id), u);
    }
  }
  return map;
}

function formatAuthorApplicationItem({
  app,
  author,
  user,
}: {
  app?: RawAppDoc | null;
  author?: RawAuthorDoc | null;
  user?: PopulatedUser | null;
}): AdminAuthorApplicationItem {
  const isAuthorActive = author?.status === "ACTIVE";
  const isAuthorHidden = author?.status === "INACTIVE";
  const isAuthorRejected = author?.status === "REJECTED";
  const hasApp = !!app;
  const isOrphaned = !user && !!author;

  const rawSocialUrl =
    app?.socialUrl && typeof app.socialUrl === "string" && isSafeHttpUrl(app.socialUrl)
      ? app.socialUrl
      : null;

  let socialLinks = Array.isArray(app?.socialLinks)
    ? app.socialLinks
        .map((link: IAuthorApplicationSocialLink) => ({
          platform: link.platform ?? "",
          url: link.url ?? "",
        }))
        .filter((link: IAuthorApplicationSocialLink) => link.url && isSafeHttpUrl(link.url))
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

  const rawReviewer = (app?.reviewedBy || author?.rejectedBy) as {
    _id?: unknown;
    name?: string;
    email?: string;
  } | null;

  const displayName = app?.displayName || author?.penName || user?.name || "লেখক";
  const applicantName = user?.name || displayName;
  const registeredEmail =
    user?.email || app?.email || (isOrphaned ? "অ্যাকাউন্ট অনুপলব্ধ" : "");

  const rawCreated = app?.createdAt || author?.createdAt;
  const createdAt =
    rawCreated instanceof Date
      ? rawCreated.toISOString()
      : typeof rawCreated === "string"
      ? rawCreated
      : new Date().toISOString();

  const rawUpdated = app?.updatedAt || author?.updatedAt;
  const updatedAt =
    rawUpdated instanceof Date
      ? rawUpdated.toISOString()
      : typeof rawUpdated === "string"
      ? rawUpdated
      : new Date().toISOString();

  let status: AuthorApplicationStatus = "APPROVED";
  if (isAuthorRejected || app?.status === "REJECTED") {
    status = "REJECTED";
  } else if (app?.status) {
    status = app.status;
  } else if (isAuthorHidden || isAuthorActive) {
    status = "APPROVED";
  }

  const rejectedAt = author?.rejectedAt
    ? author.rejectedAt instanceof Date
      ? author.rejectedAt.toISOString()
      : String(author.rejectedAt)
    : app?.reviewedAt instanceof Date
    ? app.reviewedAt.toISOString()
    : app?.reviewedAt
    ? String(app.reviewedAt)
    : null;

  const rejectionReason =
    author?.rejectionReason || app?.rejectionReason || null;

  return {
    _id: app?._id ? String(app._id) : String(author?._id),
    applicationId: app?._id ? String(app._id) : null,
    authorId: author?._id ? String(author._id) : null,
    userId: user?._id
      ? String(user._id)
      : String(
          (app?.user as PopulatedUser)?._id ||
            app?.user ||
            (author?.user as PopulatedUser)?._id ||
            author?.user ||
            ""
        ),
    applicantName,
    registeredEmail,
    applicantImage: user?.image || author?.profileImage || null,
    displayName,
    applicationEmail: app?.email || user?.email || "",
    phone: app?.phone || "",
    address: app?.address || "",
    occupation: app?.occupation || "",
    socialUrl: effectiveSocialUrl,
    socialLinks,
    bio: author?.bio || app?.bio || "",
    reason: app?.reason || "সরাসরি / ডেমো লেখক প্রোফাইল",
    status,
    isAuthorActive,
    isAuthorHidden,
    isAuthorRejected,
    hasApplication: hasApp,
    isOrphaned,
    userRole: user?.role,
    hiddenAt: author?.hiddenAt
      ? author.hiddenAt instanceof Date
        ? author.hiddenAt.toISOString()
        : String(author.hiddenAt)
      : null,
    rejectedAt,
    reviewedBy: rawReviewer
      ? {
          id: String(rawReviewer._id),
          name: rawReviewer.name ?? "",
          email: rawReviewer.email ?? "",
        }
      : null,
    reviewedAt:
      app?.reviewedAt instanceof Date
        ? app.reviewedAt.toISOString()
        : app?.reviewedAt
        ? String(app.reviewedAt)
        : null,
    rejectionReason,
    createdAt,
    updatedAt,
  };
}

export async function queryAdminAuthorApplications(
  params: AdminAuthorApplicationsSearchParams = {}
): Promise<AdminAuthorApplicationsResult> {
  await dbConnect();
  void User;
  void Author;

  const limit =
    typeof params.limit === "number" && params.limit > 0
      ? Math.floor(params.limit)
      : 10;
  const requestedPage =
    typeof params.page === "number" && !isNaN(params.page) && params.page > 0
      ? Math.floor(params.page)
      : 1;

  const statusUpper = params.status?.toUpperCase() || "ALL";
  const searchTrimmed = params.q?.trim() || "";
  const safeQ = searchTrimmed ? escapeRegex(searchTrimmed) : "";
  const regex = safeQ ? { $regex: safeQ, $options: "i" } : null;

  // Find user IDs matching search query
  let matchingUserIds: Types.ObjectId[] = [];
  if (regex) {
    const matchingUsers = await User.find({
      $or: [{ name: regex }, { email: regex }],
    })
      .select("_id")
      .lean();
    matchingUserIds = matchingUsers.map((u) => u._id as Types.ObjectId);
  }

  // Branch by filter for maximum precision
  if (statusUpper === "PENDING") {
    const appQuery: Record<string, unknown> = { status: "PENDING" };
    if (regex) {
      appQuery.$or = [
        { displayName: regex },
        { email: regex },
        { phone: regex },
        { occupation: regex },
        ...(matchingUserIds.length > 0 ? [{ user: { $in: matchingUserIds } }] : []),
      ];
    }

    const totalCount = await AuthorApplication.countDocuments(appQuery);
    const totalPages = totalCount > 0 ? Math.ceil(totalCount / limit) : 1;
    const effectivePage = totalCount > 0 ? Math.min(requestedPage, totalPages) : 1;
    const skip = (effectivePage - 1) * limit;

    const rawApps = await AuthorApplication.find(appQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("reviewedBy", "name email")
      .lean();

    const userMap = await fetchUserMapForDocs(rawApps);

    const applications = rawApps.map((app) => {
      const userIdStr = app.user ? String(app.user) : "";
      const u = userIdStr ? userMap.get(userIdStr) || null : null;
      return formatAuthorApplicationItem({
        app: app as unknown as RawAppDoc,
        user: u,
      });
    });

    return {
      applications,
      totalCount,
      totalPages,
      currentPage: effectivePage,
      pageSize: limit,
    };
  }

  if (statusUpper === "REJECTED") {
    const appQuery: Record<string, unknown> = { status: "REJECTED" };
    if (regex) {
      appQuery.$or = [
        { displayName: regex },
        { email: regex },
        { phone: regex },
        { occupation: regex },
        ...(matchingUserIds.length > 0 ? [{ user: { $in: matchingUserIds } }] : []),
      ];
    }

    const authorQuery: Record<string, unknown> = { status: "REJECTED" };
    if (regex) {
      authorQuery.$or = [
        { penName: regex },
        { bio: regex },
        ...(matchingUserIds.length > 0 ? [{ user: { $in: matchingUserIds } }] : []),
      ];
    }

    const [rawApps, rawRejectedAuthors] = await Promise.all([
      AuthorApplication.find(appQuery)
        .sort({ updatedAt: -1, createdAt: -1 })
        .populate("reviewedBy", "name email")
        .lean(),
      Author.find(authorQuery)
        .sort({ rejectedAt: -1, updatedAt: -1, createdAt: -1 })
        .lean(),
    ]);

    const userMap = await fetchUserMapForDocs([...rawApps, ...rawRejectedAuthors]);

    const authorByUserId = new Map<string, RawAuthorDoc>();
    const authorByName = new Map<string, RawAuthorDoc>();
    for (const auth of rawRejectedAuthors) {
      if (auth.user) authorByUserId.set(String(auth.user), auth as unknown as RawAuthorDoc);
      if (auth.penName) authorByName.set(auth.penName.toLowerCase(), auth as unknown as RawAuthorDoc);
    }

    const appUserIds = rawApps.map((a) => (a.user ? String(a.user) : null)).filter((id): id is string => !!id);
    const validAppUserObjIds = appUserIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    const linkedAuthors = appUserIds.length > 0
      ? ((await Author.find({
          $or: [
            ...(validAppUserObjIds.length > 0 ? [{ user: { $in: validAppUserObjIds } }] : []),
            { user: { $in: appUserIds } },
          ],
        }).lean()) as unknown as RawAuthorDoc[])
      : [];
    for (const auth of linkedAuthors) {
      if (auth.user && !authorByUserId.has(String(auth.user))) {
        authorByUserId.set(String(auth.user), auth);
      }
    }

    const pairedAuthorIds = new Set<string>();

    const appItems = rawApps.map((app) => {
      const userIdStr = app.user ? String(app.user) : "";
      const author = authorByUserId.get(userIdStr) || authorByName.get((app.displayName || "").toLowerCase()) || null;
      if (author?._id) pairedAuthorIds.add(String(author._id));
      const u = userIdStr ? userMap.get(userIdStr) || null : null;
      return formatAuthorApplicationItem({
        app: app as unknown as RawAppDoc,
        author,
        user: u,
      });
    });

    const standaloneRejectedItems = rawRejectedAuthors
      .filter((auth) => !pairedAuthorIds.has(String(auth._id)))
      .map((author) => {
        const userIdStr = author.user ? String(author.user) : "";
        const u = userIdStr ? userMap.get(userIdStr) || null : null;
        return formatAuthorApplicationItem({
          author: author as unknown as RawAuthorDoc,
          user: u,
        });
      });

    const allRejectedItems = [...appItems, ...standaloneRejectedItems];
    const totalCount = allRejectedItems.length;
    const totalPages = totalCount > 0 ? Math.ceil(totalCount / limit) : 1;
    const effectivePage = totalCount > 0 ? Math.min(requestedPage, totalPages) : 1;
    const skip = (effectivePage - 1) * limit;
    const applications = allRejectedItems.slice(skip, skip + limit);

    return {
      applications,
      totalCount,
      totalPages,
      currentPage: effectivePage,
      pageSize: limit,
    };
  }

  if (statusUpper === "APPROVED") {
    // Approved authors = all Authors with status ACTIVE
    const authorQuery: Record<string, unknown> = { status: "ACTIVE" };
    if (regex) {
      authorQuery.$or = [
        { penName: regex },
        { bio: regex },
        ...(matchingUserIds.length > 0 ? [{ user: { $in: matchingUserIds } }] : []),
      ];
    }

    const totalCount = await Author.countDocuments(authorQuery);
    const totalPages = totalCount > 0 ? Math.ceil(totalCount / limit) : 1;
    const effectivePage = totalCount > 0 ? Math.min(requestedPage, totalPages) : 1;
    const skip = (effectivePage - 1) * limit;

    const rawAuthors = await Author.find(authorQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const userMap = await fetchUserMapForDocs(rawAuthors);

    const authorUserIds = rawAuthors
      .map((a) => (a.user ? String(a.user) : null))
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    const validAuthorUserObjectIds = authorUserIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const existingApps = (await AuthorApplication.find({
      $or: [
        ...(validAuthorUserObjectIds.length > 0
          ? [{ user: { $in: validAuthorUserObjectIds } }]
          : []),
        { user: { $in: authorUserIds } },
      ],
    })
      .sort({ createdAt: -1 })
      .populate("reviewedBy", "name email")
      .lean()) as unknown as RawAppDoc[];

    const appMap = new Map<string, RawAppDoc>();
    for (const app of existingApps) {
      if (app.user) {
        const uId = String(app.user);
        if (!appMap.has(uId)) {
          appMap.set(uId, app);
        }
      }
    }

    const applications = rawAuthors.map((author) => {
      const userIdStr = author.user ? String(author.user) : "";
      const u = userIdStr ? userMap.get(userIdStr) || null : null;
      const app = appMap.get(userIdStr) || null;
      return formatAuthorApplicationItem({
        app,
        author: author as unknown as RawAuthorDoc,
        user: u,
      });
    });

    return {
      applications,
      totalCount,
      totalPages,
      currentPage: effectivePage,
      pageSize: limit,
    };
  }

  if (statusUpper === "HIDDEN") {
    // Hidden authors = all Authors with status INACTIVE
    const authorQuery: Record<string, unknown> = { status: "INACTIVE" };
    if (regex) {
      authorQuery.$or = [
        { penName: regex },
        { bio: regex },
        ...(matchingUserIds.length > 0 ? [{ user: { $in: matchingUserIds } }] : []),
      ];
    }

    const totalCount = await Author.countDocuments(authorQuery);
    const totalPages = totalCount > 0 ? Math.ceil(totalCount / limit) : 1;
    const effectivePage = totalCount > 0 ? Math.min(requestedPage, totalPages) : 1;
    const skip = (effectivePage - 1) * limit;

    const rawAuthors = await Author.find(authorQuery)
      .sort({ hiddenAt: -1, updatedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const userMap = await fetchUserMapForDocs(rawAuthors);

    const authorUserIds = rawAuthors
      .map((a) => (a.user ? String(a.user) : null))
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    const validAuthorUserObjectIds = authorUserIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const existingApps = (await AuthorApplication.find({
      $or: [
        ...(validAuthorUserObjectIds.length > 0
          ? [{ user: { $in: validAuthorUserObjectIds } }]
          : []),
        { user: { $in: authorUserIds } },
      ],
    })
      .sort({ createdAt: -1 })
      .populate("reviewedBy", "name email")
      .lean()) as unknown as RawAppDoc[];

    const appMap = new Map<string, RawAppDoc>();
    for (const app of existingApps) {
      if (app.user) {
        const uId = String(app.user);
        if (!appMap.has(uId)) {
          appMap.set(uId, app);
        }
      }
    }

    const applications = rawAuthors.map((author) => {
      const userIdStr = author.user ? String(author.user) : "";
      const u = userIdStr ? userMap.get(userIdStr) || null : null;
      const app = appMap.get(userIdStr) || null;
      return formatAuthorApplicationItem({
        app,
        author: author as unknown as RawAuthorDoc,
        user: u,
      });
    });

    return {
      applications,
      totalCount,
      totalPages,
      currentPage: effectivePage,
      pageSize: limit,
    };
  }

  // ALL: query both AuthorApplications and standalone Authors without applications
  const appQuery: Record<string, unknown> = {};
  if (regex) {
    appQuery.$or = [
      { displayName: regex },
      { email: regex },
      { phone: regex },
      { occupation: regex },
      ...(matchingUserIds.length > 0 ? [{ user: { $in: matchingUserIds } }] : []),
    ];
  }

  const [rawApps, allAppUserIds] = await Promise.all([
    AuthorApplication.find(appQuery)
      .sort({ createdAt: -1 })
      .populate("reviewedBy", "name email")
      .lean(),
    AuthorApplication.distinct("user"),
  ]);

  const authorQuery: Record<string, unknown> = {
    user: { $nin: allAppUserIds },
  };
  if (regex) {
    authorQuery.$or = [
      { penName: regex },
      { bio: regex },
      ...(matchingUserIds.length > 0 ? [{ user: { $in: matchingUserIds } }] : []),
    ];
  }

  const standaloneAuthors = await Author.find(authorQuery)
    .sort({ createdAt: -1 })
    .lean();

  const userMap = await fetchUserMapForDocs([...rawApps, ...standaloneAuthors]);

  // For rawApps with APPROVED status, look up Author status
  const approvedAppUserIds = rawApps
    .filter((a) => a.status === "APPROVED" && a.user)
    .map((a) => String(a.user));

  const validApprovedObjectIds = approvedAppUserIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  const correspondingAuthors = (await Author.find({
    $or: [
      ...(validApprovedObjectIds.length > 0
        ? [{ user: { $in: validApprovedObjectIds } }]
        : []),
      { user: { $in: approvedAppUserIds } },
    ],
  }).lean()) as unknown as RawAuthorDoc[];

  const authorByUserId = new Map<string, RawAuthorDoc>();
  for (const auth of correspondingAuthors) {
    if (auth.user) {
      authorByUserId.set(String(auth.user), auth);
    }
  }

  const appItems = rawApps.map((app) => {
    const userIdStr = app.user ? String(app.user) : "";
    const author = authorByUserId.get(userIdStr) || null;
    const u = userIdStr ? userMap.get(userIdStr) || null : null;
    return formatAuthorApplicationItem({
      app: app as unknown as RawAppDoc,
      author,
      user: u,
    });
  });

  const standaloneItems = standaloneAuthors.map((author) => {
    const userIdStr = author.user ? String(author.user) : "";
    const u = userIdStr ? userMap.get(userIdStr) || null : null;
    return formatAuthorApplicationItem({
      author: author as unknown as RawAuthorDoc,
      user: u,
    });
  });

  // Combine and sort by createdAt DESC
  const combined = [...appItems, ...standaloneItems].sort((a, b) => {
    const tA = new Date(a.createdAt).getTime();
    const tB = new Date(b.createdAt).getTime();
    return tB - tA;
  });

  const totalCount = combined.length;
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / limit) : 1;
  const effectivePage = totalCount > 0 ? Math.min(requestedPage, totalPages) : 1;
  const skip = (effectivePage - 1) * limit;
  const applications = combined.slice(skip, skip + limit);

  return {
    applications,
    totalCount,
    totalPages,
    currentPage: effectivePage,
    pageSize: limit,
  };
}

export async function getAdminAuthorApplications(
  params: AdminAuthorApplicationsSearchParams = {}
): Promise<AdminAuthorApplicationsResult> {
  await requireAdmin();
  return queryAdminAuthorApplications(params);
}

export async function queryAdminAuthorApplicationCounts(): Promise<AdminAuthorApplicationCounts> {
  await dbConnect();
  void User;
  void Author;

  const [pending, rejectedApps, hidden, approved, totalApps, allAppUserIds, rejectedAppUserIds] =
    await Promise.all([
      AuthorApplication.countDocuments({ status: "PENDING" }),
      AuthorApplication.countDocuments({ status: "REJECTED" }),
      Author.countDocuments({ status: "INACTIVE" }),
      Author.countDocuments({ status: "ACTIVE" }),
      AuthorApplication.countDocuments({}),
      AuthorApplication.distinct("user"),
      AuthorApplication.find({ status: "REJECTED" }).distinct("user"),
    ]);

  const standaloneAuthorsCount = await Author.countDocuments({
    user: { $nin: allAppUserIds },
  });

  const standaloneRejectedAuthors = await Author.countDocuments({
    status: "REJECTED",
    user: { $nin: rejectedAppUserIds },
  });

  const rejected = rejectedApps + standaloneRejectedAuthors;
  const all = totalApps + standaloneAuthorsCount;

  return { all, pending, approved, rejected, hidden };
}

export async function getAdminAuthorApplicationCounts(): Promise<AdminAuthorApplicationCounts> {
  await requireAdmin();
  return queryAdminAuthorApplicationCounts();
}


