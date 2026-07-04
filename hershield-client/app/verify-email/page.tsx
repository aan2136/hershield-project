"use client";

import axios from "axios";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Mail, ArrowRight } from "lucide-react";

import Background from "@/components/Background";
import AuthCard from "@/components/AuthCard";
import Logo from "@/components/Logo";

export default function VerifyEmailPage() {
  const router = useRouter();

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(30);
  const [loading, setLoading] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (timer === 0) return;

    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  const handleChange = (value: string, index: number) => {
    if (!/^\d?$/.test(value)) return;

    const copy = [...otp];
    copy[index] = value;
    setOtp(copy);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleBackspace = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (
    e: React.ClipboardEvent<HTMLInputElement>
  ) => {
    e.preventDefault();

    const value = e.clipboardData
      .getData("text")
      .slice(0, 6);

    if (!/^\d+$/.test(value)) return;

    const arr = value.split("");

    setOtp([
      arr[0] || "",
      arr[1] || "",
      arr[2] || "",
      arr[3] || "",
      arr[4] || "",
      arr[5] || "",
    ]);
  };

  const handleVerifyOTP = async () => {
    try {
      setLoading(true);

      const email = localStorage.getItem("email");

      const enteredOTP = otp.join("");

      const res = await axios.post(
        "http://localhost:5000/api/auth/verify-otp",
        {
          email,
          otp: enteredOTP,
        }
      );

      alert(res.data.message);

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      router.push("/emergency");
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          "Verification Failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Background>
      <AuthCard>
        <Logo />

        <div className="mb-8 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-cyan-500/20">
            <Mail
              className="text-cyan-400"
              size={38}
            />
          </div>
        </div>

        <h2 className="text-center text-2xl font-bold">
          Verify Email
        </h2>

        <p className="mt-2 text-center text-slate-400">
          Enter the 6-digit OTP sent to your email.
        </p>

        <div className="mt-10 flex justify-center gap-3">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              value={digit}
              maxLength={1}
              onPaste={handlePaste}
              onKeyDown={(e) =>
                handleBackspace(e, index)
              }
              onChange={(e) =>
                handleChange(e.target.value, index)
              }
              className="h-16 w-16 rounded-xl border border-slate-700 bg-slate-900 text-center text-2xl font-bold text-white outline-none transition focus:border-cyan-500"
            />
          ))}
        </div>

        <div className="mt-8 text-center">
          {timer > 0 ? (
            <p className="text-slate-400">
              Resend OTP in{" "}
              <span className="font-bold text-cyan-400">
                {timer}s
              </span>
            </p>
          ) : (
            <button
              onClick={() => setTimer(30)}
              className="font-semibold text-cyan-400 hover:text-cyan-300"
            >
              Resend OTP
            </button>
          )}
        </div>

        <button
          onClick={handleVerifyOTP}
          disabled={loading}
          className="mt-10 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 text-lg font-semibold transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-slate-700"
        >
          {loading ? "Verifying..." : "Verify OTP"}

          <ArrowRight size={20} />
        </button>
      </AuthCard>
    </Background>
  );
}