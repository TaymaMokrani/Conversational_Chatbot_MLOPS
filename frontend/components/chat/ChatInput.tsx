/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import { useStore } from "@nanostores/react";
import {
  ArrowUp,
  Brain,
  GitPullRequestArrow,
  Images,
  Loader2,
  Trash2,
  Paperclip,
  YoutubeIcon,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState, useRef } from "react";
import ToolTip from "../common/ToolTip";
import ToggleButton from "./InputComponents/ToggleButton";
import { signal } from "@preact/signals-react";
import { useSignals } from "@preact/signals-react/runtime";
import Tiptap from "./TipTap";
import { create } from "zustand";

const Files = signal<any[]>([]);
export const input = signal("");
type ChatState = {
  state: boolean;
  on: () => void;
  off: () => void;
};

export const useChatState = create<ChatState>((set) => ({
  state: false,
  on: () => set({ state: true }),
  off: () => set({ state: false }),
}));
const Limits = {
  Free: 1024 * 1024 * 50, // 5MB
  Premium: 1024 * 1024 * 250, // 25MB
};
export const ChatInput = () => {
  useSignals();
  const $isChatHidden = useChatState();
  const [greeting, setGreeting] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 18) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  }, []);

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
      console.log(file);
      Files.value = [...Files.value, file];
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

  function fileToBase64(file:any) {
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

  // const handleFileChange = async (e) => {
  //   for (const file of e.target.files) {
  //     if (file.size < Limits[UserSub.value]) {
  //       // Add file to Files with a temporary ref (null), then update ref after upload
  //       Files.value = [...Files.value, { ref: null, file }];
  //       // const f = await fileToJSON(file);
  //       // const uploaded = await AURA.Functions.UploadFile({
  //       //   _file: f,
  //       //   _userID: AURA.Auth.User.id,
  //       // });
  //       let Ref;
  //       await AURA.Storage.Upload(file, AURA.Auth.User.id).then(
  //         async (data) => {
  //           const r = await AURA.Database.UserFiles.Insert({
  //             FileID: (data as any).file.ID, // TODO : fix SDK
  //             UserID: AURA.Auth.User.id,
  //             TTL: 1,
  //           });
  //           Ref = r;
  //         }
  //       );
  //       // Find the last inserted file and update its ref
  //       Files.value = Files.value.map((entry, i) =>
  //         i === Files.value.length - 1 ? { ...entry, ref: Ref } : entry
  //       );
  //     } else {
  //       console.log("Hit");
  //     }
  //   }
  // };

  // --- Reset state and PLATE value ---
  const Reset = () => {
    input.value = "";
    Files.value = [];
    if (typeof window !== "undefined") {
      localStorage.removeItem("chatInputValue");
    }
  };

  // --- handleSend now uses Plate plain text value ---
  const handleSend = async () => {
    // if (isGenerating.value) return;
    // // @ts-ignore
    // const Prompt = {
    //   Query: input.value,
    //   Search: Search.value,
    //   Youtube: YoutubeSearch.value,
    //   Images: ImageSearch.value,
    //   Diagram: Diagram.value,
    //   Think: Think.value,
    //   Temp: Creativity.value,
    //   UserID: AURA.Auth.User.id,
    //   SessionID: ConvoID.value,
    //   Files: Files.value.length > 0 ? Files.value.map((e) => e.ref.FileID) : [],
    // };
    // if (Prompt.Query.trim() === "" && Prompt.Files.length == 0) return;

    // Send(Prompt);
    // Reset();
  };



  return (
    <div
      className={`absolute flex items-center transition-all max-[960px]:p-2 max-[960px]:pb-2.5  max-[960px]:ml-0  max-[960px]:top-[unset]  max-[960px]:bottom-0   max-[960px]:translate-y-0 flex-col w-fit min-w-[960px] max-[960px]:w-full max-[960px]:min-w-0 z-100 ${
        $isChatHidden.state
          ? "translate-y-0 top-[unset] bottom-2"
          : "-translate-y-1/2 top-1/2 bottom-[unset]"
      }`}
    >
      {!$isChatHidden.state && (
        <div
          className="flex flex-col max-w-[900px] items-center max-[960px]:px-5 max-[960px]:items-start max-[960px]:w-full justify-center mb-4 max-[960px]:mb-[15svh]"
          style={greeting ? {} : { opacity: 0, transform: "translateY(20px)" }}
        >
          <h1 className="select-none text-[3em] max-[960px]:text-[2.6em] max-[960px]:text-nowrap mb-2  font-[Figtree]! font-bold  flex max-[960px]:flex-col gap-3">
            <p>{greeting}</p>
            <p className="max-[960px]:-mt-5">
              <span className="inline">
                <img
                  className="w-14 -mt-6 aspect-square inline"
                  src="https://registry.npmmirror.com/@lobehub/fluent-emoji-anim-1/latest/files/assets/1f44b.webp"
                  alt=""
                />
              </span>
            </p>
          </h1>
          <p className="select-none  text-[1em] max-[960px]:text-sm  -mt-[10px]">
            What can I help you with today , What&rsquo;s on your mind ?
          </p>
        </div>
      )}
      <div className="flex flex-col translate-x-[-5px] max-[960px]:translate-x-0 max-[960px]:flex-col-reverse  relative h-fit w-full max-w-[900px]">
        <div className="absolute w-full h-16 bg-white dark:bg-neutral-900 max-w-[904px] top-3/4 pointer-events-none select-none"></div>
        
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            delay: $isChatHidden.state ? 0 : 0.1,
            duration: 0.2,
            ease: "easeOut",
          }}
          className={`relative w-full h-full max-w-[900px]  dark:bg-[#222]  bg-neutral-100 ${
            $isChatHidden.state ? "mt-0" : "mt-10"
          } max-[960px]:mt-2  flex flex-col rounded-xl overflow-hidden border `}
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
            <div className="absolute w-full h-8 bg-linear-to-t from-[#f5f5f5] dark:from-[#222222] pointer-events-none from-5% to-transparent to-100% z-10 -bottom-px left-0"></div>
            <div className="relative **:focus:outline-none ">
              <Tiptap 
                // onPasteImage={async (file) => {
                //   if (file.size < Limits[UserSub.value]) {
                //     // Add file to Files with a temporary ref (null), then update ref after upload
                //     Files.value = [...Files.value, { ref: null, file }];
                //     let Ref;
                //     await AURA.Storage.Upload(file, AURA.Auth.User.id).then(
                //       async (data) => {
                //         const r = await AURA.Database.UserFiles.Insert({
                //           FileID: (data as any).file.ID, // TODO : fix SDK
                //           UserID: AURA.Auth.User.id,
                //           TTL: 1,
                //         });
                //         Ref = r;
                //       }
                //     );
                //     // Find the last inserted file and update its ref
                //     Files.value = Files.value.map((entry, i) =>
                //       i === Files.value.length - 1
                //         ? { ...entry, ref: Ref }
                //         : entry
                //     );
                //   } else {
                //     console.log("Hit");
                //   }
                // }}
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
          <label className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-md hover:cursor-pointer active:scale-95 w-7 h-7 ">
            <Paperclip size={20} />
            <input
              type="file"
              multiple
              className="hidden"
              // onChange={handleFileChange}
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
                  false ||
                  Files.value.some((f) => f.ref === null || f.ref === undefined)
                }
                className="bg-black text-white dark:bg-white dark:text-black rounded-full p-1 hover:cursor-pointer active:scale-95"
              >
                {false ||
                Files.value.some(
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

export const FileInput = ({
  file,
  onDelete,
}: {
  file: { ref: any; file: File };
  onDelete?: () => void;
}) => {
  const [url, setUrl] = useState(file.file.name.split(".")[1]);
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
