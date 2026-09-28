/** Keep the learner's layout choice while moving between course pages. */
export function withCourseLayout(href: string, fullPage: boolean): string {
  if (!fullPage) return href;
  const [pathname, query] = href.split("?", 2);
  const params = new URLSearchParams(query);
  params.set("layout", "full");
  return `${pathname}?${params.toString()}`;
}

export function withoutCourseLayout(href: string): string {
  const [pathname, query] = href.split("?", 2);
  const params = new URLSearchParams(query);
  params.delete("layout");
  const search = params.toString();
  return search ? `${pathname}?${search}` : pathname;
}

export function appendCoursePathSegment(href: string, segment: string): string {
  const [pathname, query] = href.split("?", 2);
  return `${pathname}/${segment}${query ? `?${query}` : ""}`;
}
