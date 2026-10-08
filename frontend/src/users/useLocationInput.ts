import type { LocationValues } from "@/schemas/users"
import { useCallback, useEffect, useRef, useState } from "react"

type NominatimAddress = Partial<Record<"neighbourhood" | "quarter" | "suburb" | "village" | "hamlet" | "city" | "town" | "municipality", string>>

const MAX_LOCATION_LABEL_LENGTH = 100

function neighborhoodLabel(address: NominatimAddress) {
    const area = address.neighbourhood ?? address.quarter ?? address.suburb ?? address.village ?? address.hamlet
    const city = address.city ?? address.town ?? address.village ?? address.municipality
    const label = [...new Set([area, city].filter(Boolean))].join(", ")
    if (label.length <= MAX_LOCATION_LABEL_LENGTH)
        return label
    if (city && city.length <= MAX_LOCATION_LABEL_LENGTH)
        return city
    return ""
}

function useLocationInput(onLocationChange: (location: LocationValues) => void){
    const [sharePosition, setSharePosition] = useState<boolean>(false)
    const [locationError, setLocationError] = useState<string | null> (null)
    const [isLocating, setIsLocating] = useState<boolean>(false)
    const abortControlRef = useRef<AbortController | null>(null)

    useEffect(()=>{
        abortControlRef.current?.abort()
    }, [])

    const handleEnableAutoLocation = useCallback(async ()=>{
        abortControlRef.current?.abort()
        const control = new AbortController()
        abortControlRef.current = control

        setLocationError(null)
        setIsLocating(true)
        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject)=>{
                navigator.geolocation.getCurrentPosition(resolve, reject)
            })
            const { latitude, longitude } = position.coords
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
                { signal: control.signal }
            )
            if (!res.ok)
                throw new Error(`Geocode failed: ${res.status}`)
            const data = await res.json()
            const locationText = neighborhoodLabel(data.address ?? {})
            if (!locationText)
                throw new Error("No neighborhood or city at this position")
            onLocationChange({ latitude, longitude, location_label: locationText, location_consent: true })
            setSharePosition(true)
        } catch (err) {
            if ((err as Error).name !== "AbortError") {
                setLocationError("Could not get your location. Please enter it manually.")
                setSharePosition(false)
            }
        } finally {
            if (abortControlRef.current === control)
                setIsLocating(false)
        }
    }, [onLocationChange])

    const handleManuallyLocationInput = useCallback(async(text: string)=> {
        if (!text.trim()) {
            onLocationChange({ latitude: null, longitude: null, location_label: text, location_consent: false })
            return
        }
        abortControlRef.current?.abort()
        const control = new AbortController()
        abortControlRef.current = control

        setLocationError(null)
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=1`,
                {signal: control.signal}
            )
            if (!res.ok)
                throw new Error(`Geocode failed: ${res.status}`)
            const data = await res.json()
            if (data[0]) {
                onLocationChange({
                    latitude: parseFloat(data[0].lat),
                    longitude: parseFloat(data[0].lon),
                    location_label: text.trim(),
                    location_consent: false,
                })
            } else {
                onLocationChange({ latitude: null, longitude: null, location_label: text, location_consent: false })
                setLocationError("No match for this address. Please try an valid address.")
                return
            }
        } catch (err) {
            if ((err as Error).name !== "AbortError")
                setLocationError("Could not resolve this address.")
        }

    }, [onLocationChange])

    const handleToggle = (checked: boolean) => {
        setSharePosition(checked)
        if (checked)
            handleEnableAutoLocation()
        else {
            abortControlRef.current?.abort()
            onLocationChange({ latitude: null, longitude: null, location_label: "", location_consent: false })
        }
    }

    return {
        sharePosition,
        locationError,
        isLocating,
        handleToggle,
        handleManuallyLocationInput
    }
}

export default useLocationInput