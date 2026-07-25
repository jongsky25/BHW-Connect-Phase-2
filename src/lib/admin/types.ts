export type AdminUserRow = {
  id: string;
  username: string;
  full_name: string;
  role: "bhw" | "admin" | "assessor" | "designer";
  org_unit_id: string;
  status: "invited" | "active" | "deactivated";
  contact_number: string | null;
  email: string | null;
  address: string | null;
  org_units: { name: string }[] | null;
};

export type OrgUnitOption = {
  id: string;
  name: string;
  level: string;
};
