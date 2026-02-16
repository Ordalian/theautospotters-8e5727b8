interface DefaultCarImageProps {
  brand: string;
  model: string;
  className?: string;
}

/**
 * Component to display a default car image when user doesn't upload one
 * Uses a car-specific illustration or fallback image
 */
export function DefaultCarImage({ brand, model, className = "" }: DefaultCarImageProps) {
  const fallbackUrl = `https://source.unsplash.com/800x600/?${encodeURIComponent(brand + " " + model + " car")}`;

  return (
    <div className={`relative ${className}`}>
      <img
        src={fallbackUrl}
        alt={`${brand} ${model}`}
        className="h-full w-full object-cover"
        onError={(e) => {
          // Fallback to a generic car illustration if Unsplash fails
          const target = e.target as HTMLImageElement;
          target.style.display = "none";
          const parent = target.parentElement;
          if (parent) {
            parent.classList.add("bg-gradient-to-br", "from-secondary/30", "to-secondary/10", "flex", "items-center", "justify-center");
            parent.innerHTML = `
              <div class="text-center p-4">
                <svg class="h-16 w-16 mx-auto text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <p class="mt-2 text-xs text-muted-foreground font-medium">${brand} ${model}</p>
              </div>
            `;
          }
        }}
      />
      <div className="absolute bottom-2 left-2 rounded-full bg-background/70 backdrop-blur px-2 py-0.5 text-[10px] text-muted-foreground">
        Auto image
      </div>
    </div>
  );
}
