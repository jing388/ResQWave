// API Types for Focal Login and Password Reset
export interface FocalLoginRequest {
  emailOrNumber: string;
  password: string;
}

export interface FocalLoginResponse {
  message: string;
  tempToken: string;
  otpSent?: boolean;
}

export interface FocalVerificationRequest {
  tempToken: string;
  code: string;
}

export interface FocalVerificationResponse {
  message: string;
  token: string;
  user: {
    id: string;
    role: "focal";
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

// Password Reset Types
export interface FocalPasswordResetRequest {
  emailOrNumber: string;
}

export interface FocalPasswordResetResponse {
  success: boolean;
  message: string;
  userID: number;
  expiresInMinutes: number;
  maskedEmail: string;
}

export interface FocalResetCodeVerificationRequest {
  userID: number;
  code: string;
}

export interface FocalResetCodeVerificationResponse {
  message: string;
}

export interface FocalPasswordUpdateRequest {
  userID: number;
  code: string;
  newPassword: string;
}

export interface FocalPasswordUpdateResponse {
  message: string;
}

export interface ApiError {
  message: string;
  status?: number;
}

export class ApiException extends Error {
  public status?: number;
  public data?: unknown;

  constructor(message: string, status?: number, data?: unknown) {
    super(message);
    this.name = "ApiException";
    this.status = status;
    this.data = data;
  }
}