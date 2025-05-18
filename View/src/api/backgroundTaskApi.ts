import { fetchApi } from './fetchClient';
import type { BaseResult, PictureProcessingTask } from './types';

/**
 * 获取当前用户的所有处理任务
 */
export const getUserTasks = async (): Promise<BaseResult<PictureProcessingTask[]>> => {
  return fetchApi<PictureProcessingTask[]>('/background-tasks/user-tasks');
};

/**
 * 获取特定图片的处理状态
 * @param pictureId 图片ID
 */
export const getPictureProcessingStatus = async (pictureId: number): Promise<BaseResult<PictureProcessingTask>> => {
  return fetchApi<PictureProcessingTask>(`/background-tasks/picture-status/${pictureId}`);
};
