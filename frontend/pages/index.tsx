import { ChatInput } from "@/components/chat/ChatInput";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
// import { useQuery } from "@tanstack/react-query"
import {marked} from "marked"

// import axios from "axios"
export default function Home() {
  const { messages,sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });

  return (
    <div className="flex flex-col w-screen overflow-hidden  h-screen justify-center items-center">
      <ChatInput sendMessage={sendMessage} />
      <div className="flex justify-between items-start pb-64 pt-16 w-screen overflow-y-auto">

      <div className="flex flex-col h-full w-[900px]  mx-auto gap-2 items-start ">

      {messages.map(message => (
        <div
          key={message.id}
          className={`w-full flex ${
            message.role === 'user'
              ? 'justify-end'
              : 'justify-start'
          } my-2`}
        >
          <div
            className={`max-w-[90%] rounded-xl h-fit  py-3 text-base 
            ${message.role === 'user'
              ? 'bg-pink-300 px-5 text-white rounded-br-none'
              : ' text-neutral-900 dark:text-neutral-100 rounded-bl-none'
            }`}
          >

            {message.parts.map((part, index) =>
              part.type === 'text' ? <span className="h-fit" key={index} dangerouslySetInnerHTML={{__html:marked.parse(part.text)}}></span> : null
            )}
          </div>
        </div>
      ))}
      <div className="w-full min-h-64"></div>
      </div>
      </div>
    </div>
  );
}