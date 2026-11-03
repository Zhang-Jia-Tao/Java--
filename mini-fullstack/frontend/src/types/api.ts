/** 与后端一一对应的契约类型；后端改字段这里编译就报错 */
export interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T;
}

export interface PageRes<T> {
  list: T[];
  total: number;
  page: number;
  size: number;
}

export type TaskStatus = 'TODO' | 'DOING' | 'DONE';

export interface TaskDto {
  id: number;
  title: string;
  status: TaskStatus;
  createdAt: string;
}

export interface TokenRes {
  accessToken: string;
  name: string;
  expiresIn: number;
}

export interface UploadRes {
  url: string;
  size: number;
}
