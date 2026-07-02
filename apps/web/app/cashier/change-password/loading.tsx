export default function Loading() {
  return (
    <div className="flex-1 flex flex-col justify-center items-center py-20 font-['Inter']">
      <div className="w-12 h-12 rounded-full border-4 border-purple-100 border-t-[#bd00ff] animate-spin mb-4" />
      <span className="text-gray-400 font-semibold text-sm animate-pulse">Loading security settings...</span>
    </div>
  );
}
