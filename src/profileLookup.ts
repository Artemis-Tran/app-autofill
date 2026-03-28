type AnyObj = Record<string, any>;

export function getProfileValue(obj: AnyObj, path: string): unknown {
  const fullName = () => {
    const first = String(obj?.basics?.firstName ?? "").trim();
    const last = String(obj?.basics?.lastName ?? "").trim();
    const full = [first, last].filter(Boolean).join(" ");
    return full || undefined;
  };

  const findLink = (rx: RegExp) =>
    obj?.links?.find((l: any) => rx.test(l?.label ?? ""))?.url;

  const toTime = (s?: string) => {
    if (!s) return Number.NEGATIVE_INFINITY;
    if (/present/i.test(s)) return Number.POSITIVE_INFINITY;
    const m = String(s).match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/);
    if (!m) return Number.NEGATIVE_INFINITY;
    const y = Number(m[1]);
    const mo = Number(m[2] ?? "01") - 1;
    const d = Number(m[3] ?? "01");
    return new Date(y, mo, d).getTime();
  };

  const mostRecentEdu = () => {
    const arr = Array.isArray(obj?.education) ? (obj.education as any[]) : [];
    if (!arr.length) return undefined;
    const scored = arr.map(item => {
      const start = toTime(item?.start);
      const end = toTime(item?.end);
      const ongoing = !item?.end || /present/i.test(item?.end);
      return { item, start, end, ongoing };
    });
    scored.sort((a, b) => {
      if (a.ongoing !== b.ongoing) return a.ongoing ? -1 : 1;
      if (a.end !== b.end) return b.end - a.end;
      return b.start - a.start;
    });
    return scored[0]?.item;
  };

  const yyyymm = (s?: string) => {
    if (!s) return s;
    const m = String(s).match(/^(\d{4})-(\d{2})/);
    return m ? `${m[1]}-${m[2]}` : s;
  };

  switch (path) {
    case "basics._fullName":
      return fullName();

    case "links.linkedin":
      return findLink(/linkedin/i);
    case "links.github":
      return findLink(/github/i);
    case "links.website":
      return findLink(/website|portfolio|personal/i);
    case "workAuth.usWorkAuthorization":
      return obj?.demographics?.workAuthorization;
    case "workAuth.needsSponsorship":
      return obj?.demographics?.needsSponsorship;
    case "demographics.race": {
      const arr = obj?.demographics?.raceEthnicity;
      return Array.isArray(arr) ? arr : undefined;
    }
    case "demographics.veteran":
      return obj?.demographics?.veteranStatus;
    case "education.mostRecent.school":
      return mostRecentEdu()?.school;
    case "education.mostRecent.degree":
      return mostRecentEdu()?.degree;
    case "education.mostRecent.field":
      return mostRecentEdu()?.field;
    case "education.mostRecent.start":
      return yyyymm(mostRecentEdu()?.start);
    case "education.mostRecent.end": {
      const val = mostRecentEdu()?.end;
      return /present/i.test(String(val)) ? "" : yyyymm(val);
    }
    default:
      return path.split(".").reduce<any>((o, k) => o?.[k], obj);
  }
}
