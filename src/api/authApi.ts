import { api } from "./baseApi";
import { setCredentials } from "@/features/auth/authSlice";
import type { ApiResponse, User } from "@/types";

interface LoginRequest {
  userId: string;
  password: string;
}

interface LoginResponseData {
  token: string;
  user: User;
}

export const authApi = api.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<ApiResponse<LoginResponseData>, LoginRequest>({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: credentials,
      }),

      onQueryStarted: async (_arg, { dispatch, queryFulfilled }) => {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            setCredentials({ token: data.data.token, user: data.data.user }),
          );
        } catch {}
      },
    }),
  }),
});

export const { useLoginMutation } = authApi;
