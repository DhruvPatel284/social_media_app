// src/common/interfaces/api-response.interface.ts
export interface ApiResponse<T = any> {
  requestId: string;
  result: boolean;
  statusCode: number;
  message: string;
  payload: T;
  meta?: any;
  links?: any;
}
