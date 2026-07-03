export default function WatermarkOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden rounded-lg">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 100px,
            rgba(0,0,0,0.03) 100px,
            rgba(0,0,0,0.03) 200px
          )`,
        }}
      />
      <span className="text-4xl font-bold text-gray-400/40 rotate-[-25deg] select-none whitespace-nowrap">
        TERRA META PREVIEW
      </span>
    </div>
  )
}
