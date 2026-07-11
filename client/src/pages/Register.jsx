import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { registerSchema } from "../utils/schemas";
import { useAuth } from "../context/AuthContext";
import FormInput from "../components/FormInput";
import toast from "react-hot-toast";

/**
 * Register Page - User onboarding with dynamic credential validation
 */
const Register = () => {
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    mode: "onBlur",
  });

  const onSubmit = async (data) => {
    // Remove confirmPassword before sending to API
    const { confirmPassword, ...registerData } = data;
    
    setIsSubmitting(true);
    try {
      await registerUser(registerData);
      toast.success("Registration successful!");
      navigate("/dashboard");
    } catch (error) {
      const message = error.response?.data?.message || "Registration failed. Please try again.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Already have an account?{" "}
            <Link 
              to="/login" 
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Form */}
        <form 
          className="mt-8 space-y-6 bg-white p-8 rounded-xl shadow-lg" 
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <div className="space-y-4">
            <FormInput
              label="Full Name"
              type="text"
              name="name"
              placeholder="John Doe"
              {...register("name")}
              error={errors.name?.message}
              required
              autoComplete="name"
            />

            <FormInput
              label="Email Address"
              type="email"
              name="email"
              placeholder="you@example.com"
              {...register("email")}
              error={errors.email?.message}
              required
              autoComplete="email"
            />

            <FormInput
              label="Password"
              type="password"
              name="password"
              placeholder="Min 8 chars with letter, number, special char"
              {...register("password")}
              error={errors.password?.message}
              required
              autoComplete="new-password"
            />

            <FormInput
              label="Confirm Password"
              type="password"
              name="confirmPassword"
              placeholder="Confirm your password"
              {...register("confirmPassword")}
              error={errors.confirmPassword?.message}
              required
              autoComplete="new-password"
            />
          </div>

          {/* Password Requirements */}
          <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-600">
            <p className="font-medium mb-1">Password must have:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>At least 8 characters</li>
              <li>At least one letter (a-z, A-Z)</li>
              <li>At least one number (0-9)</li>
              <li>At least one special character (!@#$%^&amp;*)</li>
            </ul>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`
              group relative w-full flex justify-center py-2 px-4
              border border-transparent text-sm font-medium rounded-md
              text-white bg-blue-600 hover:bg-blue-700
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
              disabled:bg-blue-400 disabled:cursor-not-allowed
              transition-colors duration-200
            `}
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <svg 
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24"
                >
                  <circle 
                    className="opacity-25" 
                    cx="12" 
                    cy="12" 
                    r="10" 
                    stroke="currentColor" 
                    strokeWidth="4"
                  />
                  <path 
                    className="opacity-75" 
                    fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Creating account...
              </span>
            ) : (
              "Create account"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;