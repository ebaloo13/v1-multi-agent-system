import {
  fetchWebPageTool,
  type FetchWebPageArgs,
  type FetchWebPageResult,
} from "./fetchWebPage.js";
import {
  extractSocialProfilesTool,
  type ExtractSocialProfilesArgs,
  type ExtractSocialProfilesResult,
} from "./extractSocialProfiles.js";
import {
  detectTrackingMarkersTool,
  type DetectTrackingMarkersArgs,
  type DetectTrackingMarkersResult,
} from "./detectTrackingMarkers.js";

const registeredTools = {
  fetch_web_page: fetchWebPageTool,
  extract_social_profiles: extractSocialProfilesTool,
  detect_tracking_markers: detectTrackingMarkersTool,
} as const;

export type ToolName = keyof typeof registeredTools;

type ToolArgsMap = {
  fetch_web_page: FetchWebPageArgs;
  extract_social_profiles: ExtractSocialProfilesArgs;
  detect_tracking_markers: DetectTrackingMarkersArgs;
};

type ToolResultMap = {
  fetch_web_page: FetchWebPageResult;
  extract_social_profiles: ExtractSocialProfilesResult;
  detect_tracking_markers: DetectTrackingMarkersResult;
};

export type PreauditFactsCollection = {
  facts_collection_source: "tool-harness";
  tools_used: ToolName[];
  extracted_context: {
    url: string;
    title: string;
    description: string;
    headings: FetchWebPageResult["headings"];
    content: string;
    links: string[];
    internal_links: string[];
    social_links: string[];
    social_profiles: ExtractSocialProfilesResult;
    tracking_markers: DetectTrackingMarkersResult;
  };
  digital_presence: {
    instagram: boolean;
    facebook: boolean;
    linkedin: boolean;
    tiktok: boolean;
    youtube: boolean;
    whatsapp: boolean;
    ga4_detected: boolean;
    gtm_detected: boolean;
    meta_pixel_detected: boolean;
    linkedin_insight_detected: boolean;
  };
};

function uniqueLinks(links: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const link of links) {
    if (seen.has(link)) {
      continue;
    }
    seen.add(link);
    output.push(link);
  }

  return output;
}

export function getTool<Name extends ToolName>(name: Name) {
  return registeredTools[name];
}

export async function runTool<Name extends ToolName>(
  name: Name,
  args: ToolArgsMap[Name],
): Promise<ToolResultMap[Name]> {
  switch (name) {
    case "fetch_web_page": {
      const validated = fetchWebPageTool.validate(args);
      return fetchWebPageTool.execute(validated) as Promise<ToolResultMap[Name]>;
    }
    case "extract_social_profiles": {
      const validated = extractSocialProfilesTool.validate(args);
      return extractSocialProfilesTool.execute(validated) as Promise<ToolResultMap[Name]>;
    }
    case "detect_tracking_markers": {
      const validated = detectTrackingMarkersTool.validate(args);
      return detectTrackingMarkersTool.execute(validated) as Promise<ToolResultMap[Name]>;
    }
  }
}

export async function runPreauditFactsCollection(
  url: string,
): Promise<PreauditFactsCollection> {
  const toolsUsed: ToolName[] = [
    "fetch_web_page",
    "extract_social_profiles",
    "detect_tracking_markers",
  ];
  const page = await runTool("fetch_web_page", { url });
  const socialProfiles = await runTool("extract_social_profiles", {
    links: [...page.internal_links, ...page.social_links],
  });
  const trackingMarkers = await runTool("detect_tracking_markers", {
    content: page.raw_html,
  });
  const combinedLinks = uniqueLinks([...page.internal_links, ...page.social_links]);

  return {
    facts_collection_source: "tool-harness",
    tools_used: toolsUsed,
    extracted_context: {
      url: page.url,
      title: page.title,
      description: page.meta_description,
      headings: page.headings,
      content: page.visible_text_excerpt,
      links: combinedLinks,
      internal_links: page.internal_links,
      social_links: page.social_links,
      social_profiles: socialProfiles,
      tracking_markers: trackingMarkers,
    },
    digital_presence: {
      instagram: socialProfiles.instagram !== null,
      facebook: socialProfiles.facebook !== null,
      linkedin: socialProfiles.linkedin !== null,
      tiktok: socialProfiles.tiktok !== null,
      youtube: socialProfiles.youtube !== null,
      whatsapp: socialProfiles.whatsapp !== null,
      ga4_detected: trackingMarkers.ga4_detected,
      gtm_detected: trackingMarkers.gtm_detected,
      meta_pixel_detected: trackingMarkers.meta_pixel_detected,
      linkedin_insight_detected: trackingMarkers.linkedin_insight_detected,
    },
  };
}
