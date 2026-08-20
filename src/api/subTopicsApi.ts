import { api } from "./baseApi";
import type { ApiResponse, SubTopic } from "@/types";

export const subTopicsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getSubTopicsByTopic: builder.query<SubTopic[], string>({
      query: (topicId) => `/sub-topics/topic/${topicId}`,
      transformResponse: (response: ApiResponse<SubTopic[]>) => response.data,
    }),

    getSubTopicsByTopics: builder.query<SubTopic[], string[]>({
      query: (topicIds) => ({
        url: "/sub-topics/multi-topics",
        method: "POST",
        body: { topicIds },
      }),
      transformResponse: (response: ApiResponse<SubTopic[]>) => response.data,
    }),
  }),
});

export const { useGetSubTopicsByTopicQuery, useGetSubTopicsByTopicsQuery } =
  subTopicsApi;
