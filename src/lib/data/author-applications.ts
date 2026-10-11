import dbConnect from "@/lib/db/mongoose";
import AuthorApplication, {
  type IAuthorApplicationSocialLink,
  type AuthorApplicationStatus,
} from "@/models/AuthorApplication";

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
      "displayName email phone address occupation socialLinks bio reason status createdAt updatedAt"
    )
    .lean();

  if (!application) return null;

  const socialLinks = Array.isArray(application.socialLinks)
    ? application.socialLinks
        .map((link: IAuthorApplicationSocialLink) => ({
          platform: link.platform ?? "",
          url: link.url ?? "",
        }))
        .filter((link) => link.url && isSafeHttpUrl(link.url))
    : [];

  return {
    _id: String(application._id),
    displayName: application.displayName,
    email: application.email ?? "",
    phone: application.phone ?? "",
    address: application.address ?? "",
    occupation: application.occupation ?? "",
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
