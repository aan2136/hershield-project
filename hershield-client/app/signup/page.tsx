"use client";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";

import Background from "@/components/Background";
import AuthCard from "@/components/AuthCard";
import Logo from "@/components/Logo";

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

const [fullName, setFullName] = useState("");
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");

const [loading, setLoading] = useState(false);
const handleSignup = async () => {
  try {
    setLoading(true);

    const res = await axios.post(
      "http://localhost:5000/api/auth/signup",
      {
        fullName,
        email,
        password,
      }
    );

    alert(res.data.message);

    localStorage.setItem("email", email);

    router.push("/verify-email");

  } catch (err: any) {

    alert(
      err?.response?.data?.message ||
      "Something went wrong"
    );

  } finally {

    setLoading(false);

  }
};

  return (
    <Background>
      <AuthCard>

        <Logo />

        <h2 className="mb-8 text-center text-2xl font-bold">
          Create Your Account
        </h2>

        {/* Name */}

        <div className="relative mb-5">

          <User
            className="absolute left-4 top-4 text-cyan-400"
            size={20}
          />

          <input
  value={fullName}
  onChange={(e) => setFullName(e.target.value)}
  type="text"
  placeholder="Full Name"
            className="h-14 w-full rounded-xl border border-slate-700 bg-slate-900/70 pl-12 text-white outline-none focus:border-cyan-500"
          />

        </div>

        {/* Email */}

        <div className="relative mb-5">

          <Mail
            className="absolute left-4 top-4 text-cyan-400"
            size={20}
          />

         <input
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  type="email"
  placeholder="Email Address"
            className="h-14 w-full rounded-xl border border-slate-700 bg-slate-900/70 pl-12 text-white outline-none focus:border-cyan-500"
          />

        </div>

        {/* Password */}

        <div className="relative">

          <Lock
            className="absolute left-4 top-4 text-cyan-400"
            size={20}
          />

          <input
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  type={showPassword ? "text" : "password"}
            placeholder="Password"
            className="h-14 w-full rounded-xl border border-slate-700 bg-slate-900/70 pl-12 pr-12 text-white outline-none focus:border-cyan-500"
          />

          <button
            type="button"
            onClick={() =>
              setShowPassword(!showPassword)
            }
            className="absolute right-4 top-4 text-slate-400"
          >
            {showPassword ? (
              <EyeOff size={20} />
            ) : (
              <Eye size={20} />
            )}
          </button>

        </div>

        {/* Continue */}

        <button
  onClick={handleSignup}
  disabled={loading}
  className="mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 text-lg font-semibold transition hover:bg-cyan-600 disabled:opacity-50"
>
        {loading ? "Sending OTP..." : "Continue"}

          <ArrowRight size={20} />
        </button>

        <p className="mt-8 text-center text-slate-400">

          Already have an account?

          <Link
            href="/login"
            className="ml-2 font-semibold text-cyan-400"
          >
            Login
          </Link>

        </p>

      </AuthCard>
    </Background>
  );
}