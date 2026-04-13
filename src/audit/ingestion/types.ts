export type CompanyProfile = {
  name: string;
  industry: string;
  business_model?: string;
  location?: string;
};

export type BusinessGoal = string;
export type KnownPain = string;
export type AvailableAsset = string;
export type AvailableSystem = string;

export type DetectedSocialProfiles = {
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  tiktok?: string;
  youtube?: string;
  whatsapp?: string;
  other_socials?: string[];
};

export type TrackingMarkers = {
  ga4_detected?: boolean;
  gtm_detected?: boolean;
  meta_pixel_detected?: boolean;
  linkedin_insight_detected?: boolean;
  other_markers?: string[];
};

export type PreauditSummary = {
  company_summary: string;
  seo_score: number;
  speed_score: number;
  ux_score: number;
  top_findings: string[];
};

export type AuditInputStage1 = {
  company_profile: CompanyProfile;
  business_goals: BusinessGoal[];
  known_pains: KnownPain[];
  available_assets: AvailableAsset[];
  available_systems: AvailableSystem[];
  notes?: string;
  preaudit_summary?: PreauditSummary;
  detected_social_profiles?: DetectedSocialProfiles;
  tracking_markers?: TrackingMarkers;
  missing_information: string[];
};

export type AuditIntake = {
  company_profile?: Partial<CompanyProfile>;
  company_name?: string;
  industry?: string;
  business_model?: string;
  location?: string;
  business_goals?: string[];
  known_pains?: string[];
  known_problems?: string[];
  available_assets?: string[];
  available_systems?: string[];
  systems_available?: string[];
  sales_notes?: string;
  operations_notes?: string;
  collections_notes?: string;
  digital_presence?: string | string[] | Record<string, unknown>;
  notes?: string;
};

export type AuditToolFacts = {
  detected_social_profiles?: DetectedSocialProfiles;
  tracking_markers?: TrackingMarkers;
};

export type BuildAuditInputArgs = {
  preauditOutput?: import("../../schemas/preaudit.js").PreauditOutput;
  toolFacts?: AuditToolFacts;
  intake?: AuditIntake;
};
