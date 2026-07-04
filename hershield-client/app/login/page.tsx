"use client";
import { useRouter } from "next/navigation";

import Link from "next/link";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useState } from "react";

import Background from "@/components/Background";
import AuthCard from "@/components/AuthCard";
import Logo from "@/components/Logo";



export default function LoginPage() {
  const router = useRouter();

const [email, setEmail] = useState("");

const [password, setPassword] = useState("");

const [loading, setLoading] = useState(false);

const [showPassword, setShowPassword] = useState(false);

  async function handleLogin() {
  try {
    setLoading(true);

    const res = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await res.json();

    if (!data.success) {
      alert(data.message);
      return;
    }

    localStorage.setItem("user", JSON.stringify(data.user));
localStorage.setItem("token", data.token);
    router.push("/journey");
  } catch (err) {
    console.error(err);
    alert("Server Error");
  } finally {
    setLoading(false);
  }
}

  return (
    <Background>
      <AuthCard>

        <Logo />

        <h2 className="mb-8 text-center text-2xl font-bold text-white">
          Welcome Back
        </h2>

        {/* Email */}

        <div className="relative mb-5">

          <Mail
            className="absolute left-4 top-4 text-cyan-400"
            size={20}
          />

        <input
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
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
    type={showPassword ? "text" : "password"}
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    placeholder="Password"
    className="h-14 w-full rounded-xl border border-slate-700 bg-slate-900/70 pl-12 pr-12 text-white outline-none focus:border-cyan-500"
/>
         
          <button
            type="button"
            className="absolute right-4 top-4 text-slate-400"
            onClick={() =>
              setShowPassword(!showPassword)
            }
          >
            {showPassword ? (
              <EyeOff size={20} />
            ) : (
              <Eye size={20} />
            )}
          </button>

        </div>

        <div className="mt-3 flex justify-end">

          <Link
            href="/forgot-password"
            className="text-sm text-cyan-400 hover:text-cyan-300"
          >
            Forgot Password?
          </Link>

        </div>

        <button
  onClick={handleLogin}
  disabled={loading}
  className="mt-8 h-14 w-full rounded-xl bg-cyan-500 text-lg font-semibold transition hover:bg-cyan-600"
>
  {loading ? "Logging in..." : "Login"}
</button>

        <p className="mt-8 text-center text-slate-400">

          Don't have an account?

          <Link
            href="/signup"
            className="ml-2 font-semibold text-cyan-400 hover:text-cyan-300"
          >
            Create Account
          </Link>

        </p>

      </AuthCard>
    </Background>
  );
}