export default function NotFound() {
  return (
    <div className="w-screen relative flex justify-center items-center h-svh overflow-hidden">
      <div className="w-96 relative gap-2 flex flex-col">
        <div className="font-[Code] flex  justify-between">
          <h1>404</h1>
          <div className="flex flex-col items-end">
            <p className="text-xs  opacity-50">V 1.0.0</p>
            <p className="text-sm">MLOPS</p>
            <p className="text-xs opacity-50">{new Date().toDateString()}</p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <div className="h-[2px] w-full bg-white/50"></div>
          <p className="text-[8px] font-[Code]">ERROR</p>
        </div>
      </div>
    </div>
  )
}
