import { ChatInput } from "@/components/chat/ChatInput";
// import { useQuery } from "@tanstack/react-query"
// import axios from "axios"
export default function Home() {
  // const { data, isFetched } = useQuery({
  //   queryKey: ["state"],
  //   queryFn: async () => {
  //    return (await axios.post("/api/chat", {
  //       Testing: "Data",
  //     })).data;
  //   },
  // });

  return (
    <div className="flex flex-col w-full h-full justify-center items-center">
      <ChatInput />
    </div>
  );
}