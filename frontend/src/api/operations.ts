import apiClient from './client'

type OperationJobResponse = {
  id: number
  status: string
  type: string
  output_version?: string | null
}

type BaseOperationPayload = {
  workspace: string | number
  version_ids: Array<string | number>
  [key: string]: unknown
}

const createOperation = async (path: string, payload: BaseOperationPayload) => {
  const { data } = await apiClient.post<OperationJobResponse>(path, payload)
  return data
}

export const operationsApi = {
  rotate: (payload: BaseOperationPayload) => createOperation('/operations/rotate/', payload),
  deletePages: (payload: BaseOperationPayload) => createOperation('/operations/delete-pages/', payload),
  merge: (payload: BaseOperationPayload) => createOperation('/operations/merge/', payload),
  split: (payload: BaseOperationPayload) => createOperation('/operations/split/', payload),
  compress: (payload: BaseOperationPayload) => createOperation('/operations/compress/', payload)
}
