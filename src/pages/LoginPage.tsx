import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useLoginMutation } from "@/api/authApi";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getErrorMessage } from "@/lib/utils";

const loginSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const [login, { isLoading }] = useLoginMutation();
  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await login(values).unwrap();
      navigate("/dashboard", { replace: true });
    } catch (err) {
      toast.error(
        getErrorMessage(
          err,
          "Login failed. Please check your User ID and password and try again.",
        ),
      );
      resetField("userId");
      resetField("password");
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      <div className="hidden items-center justify-center bg-brand-50 md:flex">
        <img
          src="/img/left_img.png"
          alt="Login illustration"
          className="max-h-[70vh] w-auto"
        />
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-xl font-semibold text-brand-600">PrepRoute</h1>
          <h2 className="mt-6 text-2xl font-semibold text-ink-900">Login</h2>
          <p className="mt-1 text-sm text-ink-500">
            Use your company provided Login credentials
          </p>

          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="mt-6 flex flex-col gap-4"
          >
            <Input
              label="User ID"
              placeholder="Enter User ID"
              error={errors.userId?.message}
              {...register("userId")}
            />
            <Input
              label="Password"
              type="password"
              placeholder="Enter Password"
              error={errors.password?.message}
              {...register("password")}
            />

            <Button type="submit" isLoading={isLoading} className="mt-2 w-full">
              Login
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
