const GEOLOCATION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 0,
};

const getCurrentPosition = () =>
  new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("GPS is not supported on this device."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, GEOLOCATION_OPTIONS);
  });

const buildAddressFromBigDataCloud = (data) => {
  const parts = [
    data?.locality,
    data?.city,
    data?.principalSubdivision,
    data?.postcode,
    data?.countryName,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : "";
};

const reverseGeocodeAddress = async (latitude, longitude) => {
  const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
    latitude
  )}&lon=${encodeURIComponent(longitude)}`;

  try {
    const nominatimResponse = await fetch(nominatimUrl);
    if (nominatimResponse.ok) {
      const nominatimData = await nominatimResponse.json();
      if (nominatimData) return nominatimData;
    }
  } catch {
    // Fallback handled below.
  }

  const bigDataCloudUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(
    latitude
  )}&longitude=${encodeURIComponent(longitude)}&localityLanguage=en`;

  const fallbackResponse = await fetch(bigDataCloudUrl);
  if (!fallbackResponse.ok) {
    throw new Error("Unable to fetch address from GPS location.");
  }

  const fallbackData = await fallbackResponse.json();
  const fallbackAddress = buildAddressFromBigDataCloud(fallbackData);
  if (fallbackAddress) return fallbackAddress;

  throw new Error("Address not found for current GPS location.");
};

const formatGeolocationError = (error) => {
  if (!error || typeof error !== "object") {
    return "Unable to access current location.";
  }

  if (error.code === 1) return "Location permission denied. Please allow GPS access.";
  if (error.code === 2) return "Location unavailable. Please try again.";
  if (error.code === 3) return "Location request timed out. Please try again.";

  return error.message || "Unable to access current location.";
};

export const fetchAddressFromGps = async () => {
  try {
    const position = await getCurrentPosition();
    const latitude = position?.coords?.latitude;
    const longitude = position?.coords?.longitude;

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      throw new Error("Invalid GPS coordinates received.");
    }

    const result = await reverseGeocodeAddress(latitude, longitude);
    return {
      address: typeof result === "string" ? result : result.display_name,
      structured: typeof result === "object" ? result.address : null,
      latitude,
      longitude,
    };
  } catch (error) {
    if (error?.code === 1 || error?.code === 2 || error?.code === 3) {
      throw new Error(formatGeolocationError(error));
    }
    throw new Error(error?.message || "Unable to fetch address from GPS.");
  }
};
