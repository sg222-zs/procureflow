export class ApiError extends Error {
  constructor(
    public status: number,
    public code: number,
    message: string,
    public requestId?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
