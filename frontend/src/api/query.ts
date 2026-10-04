export function toQueryString(params: Record<string, unknown>): string {
    const search = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null) return
        if (Array.isArray(value))
            value.forEach(item=>search.append(key, String(item)))
        else
            search.append(key, String(value))
    })
    const qs = search.toString()
    return qs.length > 0 ? `?${qs}` : ""
}
