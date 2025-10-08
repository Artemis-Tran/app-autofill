export interface Profile {
  basics: { firstName: string; lastName: string; email?: string; phone?: string; };
  address?: { line1?: string; line2?: string; city?: string; state?: string; postalCode?: string; country?: string; };
  links?: { label: string; url: string; }[];
  education?: { school?: string; degree?: string; field?: string; start?: string; end?: string; }[];
  work?: { company?: string; role?: string; start?: string; end?: string; summary?: string; }[];
  demographics?: {
    workAuthorization?: string;
    needsSponsorship?: boolean;
    gender?: string;
    pronouns?: string;
    raceEthnicity?: string[];
    veteranStatus?: string;
    disability?: string;
  };
}
