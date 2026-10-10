export type WorkspaceRole = 'Admin' | 'Viewer';

export interface Workspace {
  id: string;
  name: string;
  ownerUserId: number;
  adminName: string;
  adminPixKey: string;
  adminPhone?: string;
  description?: string;
  color?: string;
  icon?: string;
  createdAt?: string;
  role: WorkspaceRole;
  isOwner: boolean;
}

export interface WorkspaceMember {
  id: number;
  workspaceId: string;
  userId: number;
  userName: string;
  email: string;
  phone?: string;
  role: WorkspaceRole;
  joinedAt?: string;
}

export interface ExternalDebt {
  id: number;
  workspaceId: string;
  workspaceName: string;
  adminName: string;
  adminPixKey: string;
  debtorPhone?: string;
  debtorEmail?: string;
  description: string;
  category: string;
  cycle: string;
  totalAmount: number;
  myShare: number;
  status: 'PENDING' | 'PAID';
  date: string;
  paidAt?: string;
}
