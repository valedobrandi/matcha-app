import type { EditProfileValues } from "@/schemas/users"
import { useCallback, useEffect, useRef, useState } from "react"
import type { UseFormSetValue } from "react-hook-form"

type NominatimAddress = Partial<Record<"neighbourhood" | "quarter" | "suburb" | "village" | "hamlet" | "city" | "town" | "municipality", string>>

function neighborhoodLabel(address: NominatimAddress) {
    const area = address.neighbourhood ?? address.quarter ?? address.suburb ?? address.village ?? address.hamlet
    const city = address.city ?? address.town ?? address.village ?? address.municipality
    return [...new Set([area, city].filter(Boolean))].join(", ")
}

function useLocationInput(setValue: UseFormSetValue<EditProfileValues>){
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
            setValue("latitude", latitude)
            setValue("longitude", longitude)
            setValue("location_label", locationText)
            setValue("location_consent", true)
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
    }, [setValue])

    const handleManuallyLocationInput = useCallback(async(text: string)=> {
        if (!text.trim()) {
            setValue("latitude", null)
            setValue("longitude", null)          
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
                setValue("location_label", text.trim())
                setValue("latitude", parseFloat(data[0].lat))
                setValue("longitude", parseFloat(data[0].lon))
                setValue("location_consent", false)
            } else {
                setValue("latitude", null)
                setValue("longitude", null)
                setLocationError("No match for this address. Please try an valid address.")
                return
            }
        } catch (err) {
            if ((err as Error).name !== "AbortError")
                setLocationError("Could not resolve this address.")
        }

    }, [setValue])

    const handleToggle = (checked: boolean) => {
        setSharePosition(checked)
        if (checked)
            handleEnableAutoLocation()
        else {
            abortControlRef.current?.abort()
            setValue("latitude", null)
            setValue("longitude", null)
            setValue("location_label", "")
            setValue("location_consent", false)      
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