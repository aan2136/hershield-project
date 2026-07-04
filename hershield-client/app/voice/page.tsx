"use client";
import axios from "axios";
import { useRouter } from "next/navigation";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Play, Pause, Upload } from "lucide-react";

import Background from "@/components/Background";
import AuthCard from "@/components/AuthCard";
import Logo from "@/components/Logo";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function VoicePage() {

  const mediaRecorder = useRef<MediaRecorder | null>(null);

  const audioChunks = useRef<Blob[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [recording, setRecording] = useState(false);

  const [audioURL, setAudioURL] = useState("");

  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const router = useRouter();

  const [uploading, setUploading] = useState(false);

  const [playing, setPlaying] = useState(false);

  const startRecording = async () => {

    try {

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

      const recorder = new MediaRecorder(stream);

      mediaRecorder.current = recorder;

      audioChunks.current = [];

      recorder.ondataavailable = (event) => {

        if (event.data.size > 0) {

          audioChunks.current.push(event.data);

        }

      };

      recorder.onstop = () => {

        const blob = new Blob(audioChunks.current, {
          type: "audio/webm",
        });

        setAudioBlob(blob);

        const url = URL.createObjectURL(blob);

        setAudioURL(url);

      };

      recorder.start();

      setRecording(true);

    } catch (err) {

      alert("Microphone Permission Denied");

    }

  };

  const stopRecording = () => {

    mediaRecorder.current?.stop();

    setRecording(false);

  };

  const playAudio = () => {

    if (!audioRef.current) return;

    audioRef.current.play();

    setPlaying(true);

  };

  const pauseAudio = () => {

    if (!audioRef.current) return;

    audioRef.current.pause();

    setPlaying(false);

  };
  const uploadVoice = async () => {

  if (!audioBlob) {
    alert("Please record your voice first.");
    return;
  }

  try {

    setUploading(true);

    const email = localStorage.getItem("email");

    const formData = new FormData();

    formData.append("voice", audioBlob, "voice.webm");
    formData.append("email", email || "");

    const res = await axios.post(
      `${API_URL}/api/auth/upload-voice`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    alert(res.data.message);

    router.push("/dashboard");

  } catch (err: any) {

    alert(
      err?.response?.data?.message ||
      "Voice upload failed"
    );

  } finally {

    setUploading(false);

  }

};

  useEffect(() => {

    if (!audioRef.current) return;

    audioRef.current.onended = () => {

      setPlaying(false);

    };

  }, [audioURL]);

  return (

    <Background>

      <AuthCard>

        <Logo />

        <h2 className="text-center text-3xl font-bold">

          Voice Registration

        </h2>

        <p className="mt-2 text-center text-slate-400">

          Record your voice for emergency verification.

        </p>

        <div className="mt-10 flex justify-center">

          {

            !recording

            ?

            <button

              onClick={startRecording}

              className="flex h-28 w-28 items-center justify-center rounded-full bg-cyan-500 transition hover:bg-cyan-600"

            >

              <Mic size={50} />

            </button>

            :

            <button

              onClick={stopRecording}

              className="animate-pulse flex h-28 w-28 items-center justify-center rounded-full bg-red-500"

            >

              <Square size={46} />

            </button>

          }

        </div>

        <p className="mt-6 text-center text-lg">

          {

            recording

            ?

            "Recording..."

            :

            audioURL

            ?

            "Recording Completed"

            :

            "Tap microphone to begin"

          }

        </p>

        {

          audioURL &&

          <>

            <audio

              ref={audioRef}

              src={audioURL}

            />

            <div className="mt-8 grid grid-cols-2 gap-4">

              {

                !playing

                ?

                <button

                  onClick={playAudio}

                  className="flex h-14 items-center justify-center rounded-xl bg-slate-800"

                >

                  <Play className="mr-2" />

                  Play

                </button>

                :

                <button

                  onClick={pauseAudio}

                  className="flex h-14 items-center justify-center rounded-xl bg-slate-800"

                >

                  <Pause className="mr-2" />

                  Pause

                </button>

              }

              <button
                onClick={uploadVoice}
                disabled={uploading}
                className="flex h-14 items-center justify-center rounded-xl bg-cyan-500 disabled:bg-slate-700"
              >
                <Upload className="mr-2" />
                {uploading ? "Uploading..." : "Upload"}
              </button>

            </div>

          </>

        }

      </AuthCard>

    </Background>

  );

}
