import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const membershipApi = axios.create({
  baseURL: `${API_URL}/api/membership`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface MembershipPurchaseRequest {
  durationDays: number;
}

export interface MembershipPurchaseResponse {
  success: boolean;
  membership: {
    id: string;
    nftId: string;
    memberNumber: number;
    issuedAt: string;
    expiresAt: string;
    txDigest: string;
  };
  message: string;
}

export const purchaseMembership = async (
  durationDays: number,
  accessToken: string
): Promise<MembershipPurchaseResponse> => {
  const response = await membershipApi.post<MembershipPurchaseResponse>(
    '/purchase',
    { durationDays },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  return response.data;
};
