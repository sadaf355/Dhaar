export type DemoRole =
  | 'Regional Officer'
  | 'Checker'
  | 'Approving Authority'
  | 'Accounts Officer'
  | 'Bank Verifier'
  | 'Auditor'
  | 'Institution Admin';

export interface DemoUser {
  id: string;
  name: string;
  role: DemoRole;
  organization: string;
  institutionCode?: string; // For Institution Admin (e.g. MH-EDU-042)
  bank?: string;            // For Bank Verifier (e.g. HDFC Bank)
  email: string;
}

export const DEMO_USERS: DemoUser[] = [
  {
    id: 'usr-ro-1',
    name: 'Meera Iyer',
    role: 'Regional Officer',
    organization: 'AICTE Regional Office (WRO)',
    email: 'meera.iyer@aicte-demo.gov.in'
  },
  {
    id: 'usr-ro-2',
    name: 'Arjun Rao',
    role: 'Regional Officer',
    organization: 'AICTE Regional Office (WRO)',
    email: 'arjun.rao@aicte-demo.gov.in'
  },
  {
    id: 'usr-ck-1',
    name: 'Sana Khan',
    role: 'Checker',
    organization: 'AICTE Scrutiny Bureau',
    email: 'sana.khan@aicte-demo.gov.in'
  },
  {
    id: 'usr-aa-1',
    name: 'Vikram Sethi',
    role: 'Approving Authority',
    organization: 'AICTE Member Secretary Office',
    email: 'vikram.sethi@aicte-demo.gov.in'
  },
  {
    id: 'usr-ao-1',
    name: 'Neha Joshi',
    role: 'Accounts Officer',
    organization: 'AICTE Finance & Accounts Division',
    email: 'neha.joshi@aicte-demo.gov.in'
  },
  {
    id: 'usr-bv-1',
    name: 'Rohit Patil',
    role: 'Bank Verifier',
    organization: 'HDFC Bank Ltd (Central Ops)',
    bank: 'HDFC Bank',
    email: 'rohit.patil@hdfcbank-demo.com'
  },
  {
    id: 'usr-au-1',
    name: 'Priya Sen',
    role: 'Auditor',
    organization: 'Independent Statutory Audit',
    email: 'priya.sen@audit-demo.gov.in'
  },
  {
    id: 'usr-ia-1',
    name: 'Rajesh Deshmukh',
    role: 'Institution Admin',
    organization: 'SIES Graduate School of Technology',
    institutionCode: 'MH-EDU-042',
    email: 'rajesh.deshmukh@siesgst-demo.edu'
  }
];
