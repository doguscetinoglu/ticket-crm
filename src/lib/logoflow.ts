const LOGOFLOW_API_URL = process.env.LOGOFLOW_API_URL;
const LOGOFLOW_API_KEY = process.env.LOGOFLOW_API_KEY;

export interface LeaveRequestPayload {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  description?: string;
  handoverPerson?: string;
  address?: string;
  portalRequestId: string;
}

export interface LogoFlowResponse {
  flowId: string;
  status: string;
  message?: string;
}

async function callLogoFlow(
  path: string,
  method: "GET" | "POST" | "PUT",
  body?: unknown
): Promise<LogoFlowResponse> {
  if (!LOGOFLOW_API_URL || !LOGOFLOW_API_KEY) {
    console.warn("[LogoFlow] API not configured — using mock response");
    return { flowId: `MOCK-${Date.now()}`, status: "PENDING" };
  }

  const res = await fetch(`${LOGOFLOW_API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOGOFLOW_API_KEY}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    throw new Error(`LogoFlow API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export async function submitLeaveRequest(data: LeaveRequestPayload): Promise<LogoFlowResponse> {
  return callLogoFlow("/api/leave/submit", "POST", data);
}

export async function approveRequest(flowId: string, comment?: string): Promise<LogoFlowResponse> {
  return callLogoFlow(`/api/leave/${flowId}/approve`, "PUT", { comment });
}

export async function rejectRequest(flowId: string, reason: string): Promise<LogoFlowResponse> {
  return callLogoFlow(`/api/leave/${flowId}/reject`, "PUT", { reason });
}

export async function cancelRequest(flowId: string): Promise<LogoFlowResponse> {
  return callLogoFlow(`/api/leave/${flowId}/cancel`, "PUT", {});
}
