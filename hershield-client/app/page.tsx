"use client";

import Link from "next/link";

import Background from "@/components/Background";
import AuthCard from "@/components/AuthCard";
import Logo from "@/components/Logo";

export default function Home() {
  return (
    <Background>

      <AuthCard>

        <Logo />

        <p className="mb-10 text-center text-slate-300 leading-7">

          Protecting Every Journey with Intelligent
          AI Monitoring, Safe Route Recommendation
          and Emergency Assistance.

        </p>

        <Link href="/login">

          <button className="mb-4 h-14 w-full rounded-xl bg-cyan-500 text-lg font-semibold text-white transition hover:bg-cyan-600">

            Login

          </button>

        </Link>

        <Link href="/signup">

          <button className="h-14 w-full rounded-xl border border-cyan-500 text-lg font-semibold text-cyan-400 transition hover:bg-cyan-500 hover:text-white">

            Create Account

          </button>

        </Link>

      </AuthCard>

    </Background>
  );
}