import { defineTool } from "./types.js";
import { requireObject, requireStringArray } from "./validation.js";

export type ExtractSocialProfilesArgs = {
  links: string[];
};

export type ExtractSocialProfilesResult = {
  instagram: string | null;
  facebook: string | null;
  linkedin: string | null;
  tiktok: string | null;
  youtube: string | null;
  whatsapp: string | null;
  other_socials: string[];
};

const OTHER_SOCIAL_HOSTS = [
  "x.com",
  "twitter.com",
  "threads.net",
  "pinterest.com",
  "t.me",
  "telegram.me",
];

function isReservedInstagramPath(pathname: string): boolean {
  return /^\/(?:p|reel|reels|stories|explore|accounts)\b/i.test(pathname);
}

function isReservedFacebookPath(pathname: string): boolean {
  return /^\/(?:sharer|share|dialog|plugins|watch)\b/i.test(pathname);
}

function normalizeProfileUrl(link: string): string | null {
  try {
    const url = new URL(link);
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function classifySocialLink(link: string): {
  platform:
    | "instagram"
    | "facebook"
    | "linkedin"
    | "tiktok"
    | "youtube"
    | "whatsapp"
    | "other"
    | null;
  normalized: string | null;
} {
  const normalized = normalizeProfileUrl(link);
  if (!normalized) {
    return { platform: null, normalized: null };
  }

  const url = new URL(normalized);
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (host === "instagram.com") {
    if (path !== "/" && !isReservedInstagramPath(path)) {
      return { platform: "instagram", normalized };
    }
    return { platform: null, normalized: null };
  }

  if (host === "facebook.com" || host === "fb.com") {
    if (path !== "/" && !isReservedFacebookPath(path)) {
      return { platform: "facebook", normalized };
    }
    return { platform: null, normalized: null };
  }

  if (host === "linkedin.com" && /^\/(?:company|in|school|showcase)\//i.test(path)) {
    return { platform: "linkedin", normalized };
  }

  if (host === "tiktok.com" && /^\/@/i.test(path)) {
    return { platform: "tiktok", normalized };
  }

  if (host === "youtube.com" && /^\/(?:@|channel\/|c\/|user\/)/i.test(path)) {
    return { platform: "youtube", normalized };
  }

  if (
    host === "wa.me" ||
    host === "api.whatsapp.com" ||
    (host === "whatsapp.com" && path !== "/")
  ) {
    return { platform: "whatsapp", normalized };
  }

  if (OTHER_SOCIAL_HOSTS.includes(host)) {
    return { platform: "other", normalized };
  }

  return { platform: null, normalized: null };
}

export const extractSocialProfilesTool = defineTool<
  ExtractSocialProfilesArgs,
  ExtractSocialProfilesResult
>({
  name: "extract_social_profiles",
  description: "Detect likely social profile URLs from a list of page links.",
  validate(args: unknown): ExtractSocialProfilesArgs {
    const record = requireObject(args, "extract_social_profiles args");
    return {
      links: requireStringArray(record.links, "extract_social_profiles.links"),
    };
  },
  async execute(args: ExtractSocialProfilesArgs): Promise<ExtractSocialProfilesResult> {
    const result: ExtractSocialProfilesResult = {
      instagram: null,
      facebook: null,
      linkedin: null,
      tiktok: null,
      youtube: null,
      whatsapp: null,
      other_socials: [],
    };
    const otherSeen = new Set<string>();

    for (const link of args.links) {
      const classified = classifySocialLink(link);
      if (!classified.platform || !classified.normalized) {
        continue;
      }

      switch (classified.platform) {
        case "instagram":
          result.instagram ??= classified.normalized;
          break;
        case "facebook":
          result.facebook ??= classified.normalized;
          break;
        case "linkedin":
          result.linkedin ??= classified.normalized;
          break;
        case "tiktok":
          result.tiktok ??= classified.normalized;
          break;
        case "youtube":
          result.youtube ??= classified.normalized;
          break;
        case "whatsapp":
          result.whatsapp ??= classified.normalized;
          break;
        case "other":
          if (!otherSeen.has(classified.normalized)) {
            otherSeen.add(classified.normalized);
            result.other_socials.push(classified.normalized);
          }
          break;
      }
    }

    return result;
  },
});
