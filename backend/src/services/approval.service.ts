// Placeholder Approval Service
export class ApprovalService {
  async processApproval(_data: any): Promise<never> {
    throw new Error('ApprovalService: Not implemented');
  }
}

export const approvalService = new ApprovalService();
