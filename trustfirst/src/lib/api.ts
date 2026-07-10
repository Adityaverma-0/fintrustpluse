import { getToken } from "./auth-token";

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error ?? "Request failed");
  }
  return res.json();
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body: unknown) => apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};

export type Proposal = {
  id: number;
  jobId: number;
  freelancerId: number;
  coverLetter: string;
  bidAmount: number;
  deliveryDays: number;
  status: string;
  createdAt: string;
  job?: { id: number; title: string; description: string; category: string; budget: number; budgetType: string } | null;
  freelancer?: { id: number; name: string; title: string | null; trustScore: number | null; completionRate: number | null } | null;
};

export type Project = {
  id: number;
  jobId: number | null;
  clientId: number;
  freelancerId: number;
  title: string;
  description: string;
  status: string;
  budget: number;
  deadline: string | null;
  completedAt: string | null;
  createdAt: string;
  client?: { id: number; name: string } | null;
  freelancer?: { id: number; name: string; title: string | null } | null;
  milestones?: Milestone[];
  progress?: number;
};

export type Milestone = {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  amount: number;
  status: string;
  dueDate: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  deliverables: string | null;
  clientFeedback: string | null;
  order: number;
  createdAt: string;
};

export type Wallet = {
  id: number;
  userId: number;
  availableBalance: number;
  escrowBalance: number;
  totalEarned: number;
  totalSpent: number;
  updatedAt: string;
  createdAt: string;
};

export type WalletTransaction = {
  id: number;
  walletId: number;
  type: string;
  amount: number;
  description: string;
  referenceId: number | null;
  referenceType: string | null;
  status: string;
  createdAt: string;
};

export type Notification = {
  id: number;
  userId: number;
  type: string;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

export type Message = {
  id: number;
  senderId: number;
  receiverId: number;
  projectId: number | null;
  content: string;
  isRead: boolean;
  createdAt: string;
};

export type Conversation = {
  partner: { id: number; name: string; role: string };
  lastMessage: Message | null;
  unreadCount: number;
};

export type Contract = {
  id: number;
  projectId: number;
  clientId: number;
  freelancerId: number;
  scope: string;
  deliverables: string;
  timeline: string;
  budget: number;
  milestoneBreakdown: string | null;
  revisionPolicy: string;
  refundPolicy: string;
  paymentTerms: string;
  status: string;
  clientSignedAt: string | null;
  freelancerSignedAt: string | null;
  createdAt: string;
};

export type Submission = {
  id: number;
  projectId: number;
  milestoneId: number | null;
  freelancerId: number;
  description: string;
  files: string | null;
  version: number;
  status: string;
  clientFeedback: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

export type EscrowAccount = {
  id: number;
  projectId: number;
  clientId: number;
  freelancerId: number;
  totalAmount: number;
  releasedAmount: number;
  refundedAmount: number;
  pendingAmount: number;
  status: string;
  fundedAt: string | null;
  createdAt: string;
};

export type ActivityLog = {
  id: number;
  projectId: number | null;
  userId: number | null;
  action: string;
  details: string | null;
  entityType: string | null;
  entityId: number | null;
  createdAt: string;
  user?: { id: number; name: string; role: string } | null;
};

export type AdminStats = {
  users: { total: number; freelancers: number; clients: number };
  jobs: { total: number };
  projects: { total: number; active: number; completed: number };
  proposals: { total: number };
  disputes: { total: number };
  escrow: { totalLocked: number; totalAvailable: number; totalEarned: number };
};
