export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

export class ApiResponse<T = any> {
  public success: boolean;
  public message: string;
  public data?: T;
  public meta?: PaginationMeta;

  constructor(statusCode: number, data?: T, message = 'Success', meta?: PaginationMeta) {
    this.success = statusCode < 400;
    this.message = message;
    if (data !== undefined) {
      this.data = data;
    }
    if (meta) {
      this.meta = meta;
    }
  }

  static success<T>(data?: T, message = 'Success', meta?: PaginationMeta): ApiResponse<T> {
    return new ApiResponse(200, data, message, meta);
  }

  static created<T>(data?: T, message = 'Resource created successfully'): ApiResponse<T> {
    return new ApiResponse(201, data, message);
  }
}
