export type Profile = {
  basics: {
    firstName: string; lastName: string; email: string; phone: string;
  };
  address: {
    line1: string; line2?: string; city: string; state: string; postalCode: string; country: string;
  };
  links?: { website?: string; github?: string; linkedin?: string };
  workAuth?: { usWorkAuthorization?: string; needsSponsorship?: string; usPerson?: string };
  demographics?: { race?: string; gender?: string; veteran?: string; disability?: string };
};
