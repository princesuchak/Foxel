// API响应的基础结构
export interface BaseResult<T> {
  success: boolean;
  message: string;
  data?: T;
  code: number;
}

// 分页结果通用结构
export interface PaginatedResult<T> {
  success: boolean;
  message: string;
  data: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  code: number;
}

// 登录请求参数
export interface LoginRequest {
  email: string;
  password: string;
}

// 注册请求参数
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

// 用户信息
export interface UserProfile {
  id: number;
  userName: string;
  email: string;
  roleName: string;
}

// 认证响应
export interface AuthResponse {
  token: string;
  user: UserProfile;
}

// 图片请求参数
export interface FilteredPicturesRequest {
  page?: number;
  pageSize?: number;
  searchQuery?: string;
  tags?: string;
  startDate?: string;
  endDate?: string;
  userId?: number;
  sortBy?: string;
  onlyWithGps?: boolean;
  useVectorSearch?: boolean;
  similarityThreshold?: number;
  excludeAlbumId?: number;
  albumId?: number;
  onlyFavorites?: boolean;
  ownerId?: number;
  includeAllPublic?: boolean;
}

// 图片响应数据
export interface PictureResponse {
  id: number;
  name: string;
  path: string;
  thumbnailPath: string;
  description: string;
  takenAt?: Date;
  createdAt: Date;
  exifInfo?: any;
  tags?: string[];
  userId: number;
  username?: string;
  isFavorited: boolean;
  favoriteCount: number;
  permission: number;
  albumId?: number;
  albumName?: string;
  processingStatus: ProcessingStatus;
  processingError?: string;
  processingProgress: number;
}

// 收藏请求
export interface FavoriteRequest {
  pictureId: number;
}

// 上传队列中的文件项
export interface UploadFile {
  id: string;  // 本地ID，用于跟踪状态
  file: File;  // 原始文件
  status: 'pending' | 'uploading' | 'success' | 'error';  // 上传状态
  percent: number;  // 上传进度百分比 0-100
  error?: string;  // 错误信息
  response?: PictureResponse;  // 上传成功后的响应
}

// 上传图片请求参数
export interface UploadPictureParams {
  permission?: number;  // 权限设置，默认为0（公开）
  albumId?: number;     // 相册ID，可选
}

// 相册响应数据
export interface AlbumResponse {
  id: number;
  name: string;
  description: string;
  coverImageUrl?: string;
  pictureCount: number;
  userId: number;
  username?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 创建相册请求
export interface CreateAlbumRequest {
  name: string;
  description: string;
}

// 更新相册请求
export interface UpdateAlbumRequest {
  id: number;
  name: string;
  description: string;
}

// 相册图片操作请求
export interface AlbumPictureRequest {
  albumId: number;
  pictureId: number;
}

// 批量添加图片到相册请求
export interface AlbumPicturesRequest {
  albumId: number;
  pictureIds: number[];
}

// 删除多张图片请求
export interface DeleteMultiplePicturesRequest {
  pictureIds: number[];
}

// 将类型定义改为枚举，这样既可以作为类型也可以作为值使用
export type ProcessingStatus = 'Pending' | 'Processing' | 'Completed' | 'Failed';

// 添加常量对象提供运行时值
export const ProcessingStatus = {
  Pending: 'Pending' as ProcessingStatus,
  Processing: 'Processing' as ProcessingStatus,
  Completed: 'Completed' as ProcessingStatus,
  Failed: 'Failed' as ProcessingStatus
};

// 图片处理任务
export interface PictureProcessingTask {
  pictureId: number;
  taskId: string;
  pictureName: string;
  status: ProcessingStatus;
  progress: number; // 0-100
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

// 配置响应数据
export interface ConfigResponse {
  id: number;
  key: string;
  value: string;
  description: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface SetConfigRequest {
  key: string;
  value: string;
  description?: string;
}

export type UserRole = "Administrator" | "User" | "";

export const UserRole = {
  Administrator: "Administrator" as UserRole,
  User: "User" as UserRole,
  Guest: "" as UserRole
};

export interface UpdateUserRequest {
  userName?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}
