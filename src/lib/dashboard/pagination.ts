export const DASHBOARD_BHW_PAGE_SIZE = 25;
export const GAP_QUEUE_PAGE_SIZE = 25;

export function parsePageParam(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function parseSearchParam(value: string | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function pageOffset(page: number, pageSize: number = DASHBOARD_BHW_PAGE_SIZE): number {
  return (page - 1) * pageSize;
}

export function totalPages(totalCount: number, pageSize: number = DASHBOARD_BHW_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(totalCount / pageSize));
}
