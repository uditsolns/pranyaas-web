import React, { useState, useEffect } from "react";
import { Loader2, MapPin } from "lucide-react";

interface AddressDisplayProps {
  lat: string | number;
  lon: string | number;
  showIcon?: boolean;
}

// Simple in-memory cache to avoid redundant API calls
const addressCache = new Map<string, string>();

export function AddressDisplay({ lat, lon, showIcon = true }: AddressDisplayProps) {
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!lat || !lon) return;

    const cacheKey = `${lat},${lon}`;
    if (addressCache.has(cacheKey)) {
      setAddress(addressCache.get(cacheKey)!);
      return;
    }

    const fetchAddress = async () => {
      setLoading(true);
      setError(false);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`
        );
        const data = await response.json();
        
        if (data && data.display_name) {
          const result = data.display_name;
          addressCache.set(cacheKey, result);
          setAddress(result);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Error fetching address:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    // Small delay to avoid hitting rate limits if many components mount at once
    const timer = setTimeout(fetchAddress, 200);
    return () => clearTimeout(timer);
  }, [lat, lon]);

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 text-muted-foreground animate-pulse">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="text-xs italic">Fetching address...</span>
      </div>
    );
  }

  if (error || !address) {
    return (
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {showIcon && <MapPin className="h-3 w-3" />}
        <span className="text-xs">{lat}, {lon}</span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-1.5 group">
      {showIcon && <MapPin className="h-3 w-3 mt-0.5 text-primary/70 shrink-0" />}
      <span className="text-sm font-medium text-foreground leading-tight hover:text-primary transition-colors cursor-help" title={address}>
        {address.split(",").slice(0, 3).join(",")}
      </span>
    </div>
  );
}
