import { builtinEnvironments, type Environment } from 'vitest/environments'

export default {
    name: 'jsdom-node-abort',
    transformMode: 'web',
    async setup(global, options) {
        const { AbortController, AbortSignal } = global
        const jsdom = await builtinEnvironments.jsdom.setup(global, options)
        global.AbortController = AbortController
        global.AbortSignal = AbortSignal
        return jsdom
    },
} satisfies Environment
