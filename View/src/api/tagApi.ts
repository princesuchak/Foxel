import type { BaseResult, PaginatedResult } from './types';
import { fetchApi, BASE_URL } from './fetchClient';

// 标签响应类型
export interface TagResponse {
  id: number;
  name: string;
  description?: string;
  pictureCount: number;
  createdAt: Date;
}

// 筛选标签请求参数
export interface FilteredTagsRequest {
  page?: number;
  pageSize?: number;
  searchQuery?: string;
  sortBy?: string;
  sortDirection?: string;
}

// 创建标签请求
export interface CreateTagRequest {
  name: string;
  description?: string;
}

// 更新标签请求
export interface UpdateTagRequest {
  id: number;
  name: string;
  description?: string;
}

// 获取所有标签
export async function getAllTags(): Promise<BaseResult<TagResponse[]>> {
  return fetchApi<TagResponse[]>('/tag/all', {
    method: 'GET',
  });
}

// 获取筛选后的标签
export async function getFilteredTags(params: FilteredTagsRequest = {}): Promise<PaginatedResult<TagResponse>> {
  const queryParams = new URLSearchParams();
  
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
  if (params.searchQuery) queryParams.append('searchQuery', params.searchQuery);
  if (params.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params.sortDirection) queryParams.append('sortDirection', params.sortDirection);

  try {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${BASE_URL}/tag/get_tags?${queryParams.toString()}`;
    const response = await fetch(url, { headers });
    const data = await response.json();

    return data as PaginatedResult<TagResponse>;
  } catch (error) {
    console.error('获取标签列表失败:', error);
    return {
      success: false,
      message: '网络请求失败，请检查您的网络连接',
      data: [],
      page: 1,
      pageSize: 10,
      totalCount: 0,
      totalPages: 0,
      code: 500,
    };
  }
}

// 获取标签详情
export async function getTagById(id: number): Promise<BaseResult<TagResponse>> {
  return fetchApi<TagResponse>(`/tag/${id}`, {
    method: 'GET',
  });
}

// 创建标签
export async function createTag(request: CreateTagRequest): Promise<BaseResult<TagResponse>> {
  return fetchApi<TagResponse>('/tag/create_tag', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// 更新标签
export async function updateTag(request: UpdateTagRequest): Promise<BaseResult<TagResponse>> {
  return fetchApi<TagResponse>('/tag/update_tag', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// 删除标签
export async function deleteTag(id: number): Promise<BaseResult<boolean>> {
  return fetchApi<boolean>('/tag/delete_tag', {
    method: 'POST',
    body: JSON.stringify(id),
  });
}
