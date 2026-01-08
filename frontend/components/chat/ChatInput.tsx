/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import {
  ArrowUp,
  Loader2,
  Trash2,
  Paperclip,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState, useRef } from "react";
import ToolTip from "../common/ToolTip";
import { signal } from "@preact/signals-react";
import { useSignals } from "@preact/signals-react/runtime";
import Tiptap from "./TipTap";
import { create } from "zustand";

import { useChat } from '@ai-sdk/react';

const Files = signal<any[]>([]);
export const input = signal("");
type ChatState = {
  // Change state type from boolean to a string that reflects current status
  state: string; // intending values: 'started', 'stopped', etc
  on: () => void;
  off: () => void;
};

export const useChatState = create<ChatState>((set) => ({
  state: "stopped",
  on: () => set({ state: "started" }),
  off: () => set({ state: "stopped" }),
}));

export const ChatInput = ({sendMessage}:{sendMessage:ReturnType<typeof useChat>["sendMessage"]}) => {
  useSignals();
  const isChatHidden = true;
  const textareaRef = useRef<HTMLTextAreaElement>(null);



  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);
  useEffect(() => {
    const handler = (evnt: Event) => {
      // The event is a CustomEvent with a 'detail' property
      const customEvnt = evnt as CustomEvent<{ file: File }>;
      const file = customEvnt.detail?.file;
      if (file) {
        Files.value = [...Files.value, { ref: null, file }]; // must provide same object shape as below
      }
    };
    window.addEventListener("chat-image-paste", handler);
    return () => {
      window.removeEventListener("chat-image-paste", handler);
    };
  }, []);

  const allowedTypes = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/gif",
    "image/webp",
    "application/pdf",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint", // PowerPoint (legacy)
    "application/vnd.openxmlformats-officedocument.presentationml.presentation", // PowerPoint (modern)
    "application/zip",
    "application/x-zip-compressed",
    // Common code/text formats
    "application/javascript",
    "application/json",
    "application/x-python-code",
    "application/x-sh",
    "application/x-csh",
    "text/x-python",
    "text/x-c",
    "text/x-c++src",
    "text/x-csharp",
    "text/x-java-source",
    "text/x-go",
    "text/x-ruby",
    "text/x-php",
    "text/markdown",
    "text/html",
    "text/css",
    "application/xml",
    "text/xml",
    "application/x-yaml",
    "text/x-shellscript",
    "application/x-perl",
    "text/x-typescript",
    "application/typescript",
    "text/x-sql",
    "application/sql",
    // generic catch-all for source and script files
    "text/plain",
  ];

  function fileToBase64(file: any) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === "string") {
          resolve(result.split(",")[1]);
        } else {
          reject(new Error("Unable to convert file to Base64 string."));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // --- file upload logic: simulate upload, set ref after base64 ---
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      // Add file with null ref initially to show loading, then update with "ref".
      const index = Files.value.length;
      Files.value = [...Files.value, { ref: null, file }];
      // Simulate upload: base64 encode and return "ref"
      try {
        const base64 = await fileToBase64(file); // we could post to a server here
        // We'll use base64 as fake ref; in real world, this would be a URL/ID
        Files.value = Files.value.map((entry, i) =>
          i === index ? { ...entry, ref: base64 } : entry
        );
      } catch (_) {
        Files.value = Files.value.filter((_, i) => i !== index);
      }
    }
  };

  // --- Reset state and PLATE value ---
  const Reset = () => {
    input.value = "";
    Files.value = [];
    if (typeof window !== "undefined") {
      localStorage.removeItem("chatInputValue");
    }
  };

  // --- Send text and files as payload. Send files as array of UI parts ---
  const handleSend = async () => {
    // Convert each file to a structure matching FileUIPart for sendMessage
    const filesToSend = Files.value
      .filter(f => f.ref)
      .map(f => ({
        type: f.file.type ?? "application/octet-stream",
        mediaType: f.file.type ?? "application/octet-stream",
        url: typeof f.ref === "string" ? `data:${f.file.type};base64,${f.ref}` : "",
        fileName: f.file.name,
      }));

    sendMessage({
      text: input.value,
      files: filesToSend.length > 0 ? filesToSend : undefined,
    });
    Reset();
  };

  return (
    <div
      className={`absolute flex items-center transition-all max-[960px]:p-2 max-[960px]:pb-2.5  max-[960px]:ml-0  max-[960px]:top-[unset]  max-[960px]:bottom-0   max-[960px]:translate-y-0 flex-col w-fit min-w-[960px] max-[960px]:w-full max-[960px]:min-w-0 z-100 ${
        isChatHidden
          ? "translate-y-0 top-[unset] bottom-0"
          : "-translate-y-1/2 top-1/2 bottom-[unset]"
      }`}
    >

      <div className="flex flex-col translate-x-[2px] max-[960px]:translate-x-0 max-[960px]:flex-col-reverse  relative h-fit w-full max-w-[915px]">

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            delay: isChatHidden ? 0 : 0.1,
            duration: 0.2,
            ease: "easeOut",
          }}
          className={`relative w-full h-full max-w-[910px]  dark:bg-[#22222280] backdrop-blur-lg  bg-neutral-100 ${
            isChatHidden ? "mt-0" : "mt-10"
          } max-[960px]:mt-2  flex flex-col rounded-t-xl overflow-hidden border `}
        >
          {Files.value.length > 0 && (
            <div className="flex gap-2 items-end p-5 pb-0">
              {Files.value.map((e, i) => {
                return (
                  <FileInput
                    key={i}
                    file={e}
                    onDelete={async () => {
                      Files.value = Files.value.filter(
                        (_, index) => index !== i
                      );
                    }}
                  />
                );
              })}
            </div>
          )}
          <div className="relative max-w-[900px] h-fit min-h-22 max-h-[200px] z-0">

            <div className="relative **:focus:outline-none ">
              <Tiptap
                onChange={(e) => {
                  input.value = e;
                }}
                value={input.value}
                onEnter={() => {
                  handleSend();
                }}
              />
            </div>
          </div>
          <div className="w-full flex p-4 pb-3 pt-1 justify-between">
            <ToolTip className="z-9999" side="top" text="Upload a file or an image">
          <label className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-md hover:cursor-pointer active:scale-95 w-7 h-7">
            <Paperclip size={20} />
            <input
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
              id="file-upload"
              accept={allowedTypes.join(",")}
            />
          </label>
        </ToolTip>
            <div className="flex gap-3 items-center">
              <p className="text-sm text-black/50  dark:text-white/50">
                {input.value.length}/2000
              </p>
              <button
                onClick={handleSend}
                disabled={
                  Files.value.some((f) => f.ref === null || f.ref === undefined)
                }
                className="bg-black text-white dark:bg-white dark:text-black rounded-full p-1 hover:cursor-pointer active:scale-95"
              >
                {Files.value.some(
                  (f) => f.ref === null || f.ref === undefined
                ) ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <ArrowUp />
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// Accepts { ref: string (base64 string or file id), file: File }
export const FileInput = ({
  file,
  onDelete,
}: {
  file: { ref: any; file: File };
  onDelete?: () => void;
}) => {
  const [url, setUrl] = useState(file.file.name.split(".")[1] || "file");
  const Error = () => {
    setUrl("file");
  };

  // Helper to check if file is an image by extension
  const isImage = (filename: string) => {
    const ext = filename.split(".").pop()?.toLowerCase();
    return ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"].includes(
      ext || ""
    );
  };

  return (
    <div className="flex justify-between group text-sm items-center h-fit overflow-hidden  gap-1.5 bg-neutral-200 dark:bg-[#333] outline-2 -outline-offset-1 outline-neutral-200 dark:outline-[#333] w-fit rounded-md relative">
      <div className="flex items-center gap-2">
        {isImage(file.file.name) ? (
          <div className="relative rounded-md overflow-hidden">
            <img
              alt={file.file.name}
              src={URL.createObjectURL(file.file)}
              className="w-18 h-18 object-cover rounded"
              onError={Error}
            />
            <button
              onClick={onDelete}
              className="cursor-pointer absolute w-full h-full top-0 left-0 rounded-md flex items-center justify-center text-white hover:bg-red-500/20 hover:opacity-100 opacity-0 backdrop-blur transition-all "
            >
              <Trash2 />
            </button>
            {!file.ref && (
              <div className="rounded-md overflow-hidden absolute w-full backdrop-blur-lg h-full top-0 left-0 flex flex-col justify-center items-center">
                <Loader2 className="animate-spin" />
              </div>
            )}
          </div>
        ) : (
          <div className="p-1 flex gap-2 items-center">
            {!file.ref ? (
              <Loader2 className="animate-spin w-4 ml-1" />
            ) : (
              <>
                <img
                  alt=""
                  src={`/Code Icons/${url}.svg`}
                  className="w-4 ml-1"
                  onError={Error}
                />
                <img
                  alt="file"
                  src={`/Code Icons/${url}.svg`}
                  className="w-5 absolute blur scale-200"
                  onError={Error}
                />
              </>
            )}
            <p className="text-ellipsis overflow-hidden text-nowrap pr-8">
              {file.file.name}
            </p>
            <div className="group-hover:translate-x-0 justify-center transition translate-x-10 bg-linear-to-r from-transparent to-red-500/40 h-8 flex items-center w-8 right-0 absolute">
              <Trash2
                className=" cursor-pointer text-red-500 dark:text-red-300 "
                size={16}
                onClick={onDelete}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
