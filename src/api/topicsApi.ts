import { api } from "./baseApi";
import type { ApiResponse, Topic } from "@/types";

export const topicsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getTopicsBySubject: builder.query<Topic[], string>({
      query: (subjectId) => `/topics/subject/${subjectId}`,
      transformResponse: (response: ApiResponse<Topic[]>) => response.data,
    }),
  }),
});
export const { useGetTopicsBySubjectQuery } = topicsApi;
