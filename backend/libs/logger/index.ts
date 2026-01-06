import { Cookie, Elysia, type Context } from 'elysia'
import pc from 'picocolors'
import type { Formatter } from 'picocolors/types'

// --------------------------------------------------------------------------
// FORMATTERS
// --------------------------------------------------------------------------

const UNITS = ['µs', 'ms', 's']
const DURATION_FORMATTER = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
})

function fmtDuration(us: number): string {
  if (!Number.isFinite(us)) return '-/-'

  let value = us // value will be in microseconds at start
  let unitIndex = 0

  // Normalize: Input is us (microseconds).
  // If < 1_000, show µs. If < 1_000_000, show ms. Else s.
  if (us < 1_000) {
    value = us // µs
    unitIndex = 0
  } else if (us < 1_000_000) {
    value = us / 1_000 // ms
    unitIndex = 1
  } else {
    value = us / 1_000_000 // s
    unitIndex = 2
  }

  return `${DURATION_FORMATTER.format(value)}${UNITS[unitIndex]}`
}

const METHOD_COLOR_LUT: Record<string, Formatter> = {
  GET: pc.green,
  POST: pc.blue,
  PUT: pc.yellow,
  DELETE: pc.red,
  PATCH: pc.magenta,
  OPTIONS: pc.cyan,
  HEAD: pc.gray,
}

function fmtMethod(method: string): string {
  const colorer = METHOD_COLOR_LUT[method.toUpperCase()]
  return colorer ? colorer(method) : method
}

const STATUS_COLOR_LUT: Record<number, Formatter> = {
  200: pc.green,
  201: pc.blue,
  204: pc.yellow,
  400: pc.red,
  401: pc.magenta,
  403: pc.cyan,
  404: pc.gray,
  500: pc.red,
}

function fmtStatus(status: number | string | undefined): string {
  if (status === undefined) return ''
  const s = Number(status)
  // Map exact status or fallback to generic range colors (4xx, 5xx)
  const colorer = STATUS_COLOR_LUT[s] || (s >= 500 ? pc.red : s >= 400 ? pc.yellow : pc.gray)
  return colorer ? colorer(s.toString()) : s.toString()
}

// --------------------------------------------------------------------------
// TYPES & INTERFACES
// --------------------------------------------------------------------------

export interface LogData {
  timestamp: string
  type: 'in' | 'out'
  method: string
  path: string
  /** Duration in microseconds */
  duration: number
  status?: number
  body?: unknown
  cookies?: Record<string, string>
  headers?: Record<string, string>
  setCookies?: string[]
  query?: Record<string, string>
  error?: unknown
}

export interface LoggerOptions {
  /**
   * Determine whether logging is enabled
   * @default NODE_ENV !== 'production'
   */
  enabled?: boolean
  /**
   * Determines the mode of the logger
   * - 'live' - logs request (in) and response (out)
   * - 'combined' - logs only the response (out)
   * @default 'combined'
   */
  mode?: 'combined' | 'live'
  /**
   * Whether to print timestamp at the beginning of each line
   */
  withTimestamp?: boolean | (() => string)
  /**
   * Whether to print banner at the beginning of each line
   */
  withBanner?:
    | boolean
    | (() => void)
    | Record<string, string | ((ctx: Context) => string | undefined)>
  /**
   * Custom function to handle saving the log data (e.g., to DB or file).
   */
  customLog?: (data: LogData) => void | Promise<void>
}

// Internal store keys to avoid collisions
const START_TIME = Symbol('nice-logger:start')

/**
 * A Nice and Simple logger plugin for Elysia
 */
export const logger = (options: LoggerOptions = {}) => {
  const { enabled = process.env.NODE_ENV !== 'production', mode = 'combined' } = options

  // If disabled, return a hollow plugin instance
  if (!enabled) return new Elysia({ name: '@tqman/nice-logger' })

  const getTimestamp =
    typeof options.withTimestamp === 'function'
      ? options.withTimestamp
      : () => new Date().toISOString()

  const hasCustomLog = typeof options.customLog === 'function'

  return new Elysia({
    name: '@tqman/nice-logger',
    seed: options,
  })
    .onStart((ctx) => {
      if (!options.withBanner) return

      if (typeof options.withBanner === 'function') {
        options.withBanner()
        return
      }

      // Try to detect version safely
      let version = 'unknown'
      try {
        // @ts-ignore
        const pkg = import.meta.require
          ? import.meta.require('elysia/package.json')
          : require('elysia/package.json')
        version = pkg.version
      } catch {
        /* ignore */
      }

      console.log(`\n🦊 ${pc.green(`${pc.bold('Elysia')} v${version}`)}`)

      if (typeof options.withBanner === 'object') {
        Object.entries(options.withBanner).forEach(([key, value]) => {
          const v = typeof value === 'function' ? value(ctx as any) : value
          if (v) console.log(`${pc.green(' ➜ ')} ${pc.bold(key)}: ${pc.cyan(v)}`)
        })
      }

      const server = (ctx as any).server
      if (server) {
        console.log(`${pc.green(' ➜ ')} ${pc.bold('Server')}: ${pc.cyan(server.url.toString())}\n`)
      }
    })
    .onRequest((ctx) => {
      // 1. Store Start Time
      ctx.store = { ...ctx.store, [START_TIME]: performance.now() }

      // 2. 'Live' mode logging (Incoming)
      if (mode === 'live') {
        const timestamp = options.withTimestamp ? pc.dim(`[${getTimestamp()}]`) : ''
        console.log(
          `${timestamp} ${pc.blue('--->')} ${pc.bold(fmtMethod(ctx.request.method))} ${new URL(ctx.request.url).pathname}`,
        )

        // 3. Custom Log (Incoming)
        // Note: We cannot safely read body here without consuming the stream, so body is undefined for 'in'
        if (hasCustomLog) {
          options.customLog!({
            timestamp: getTimestamp(),
            type: 'in',
            method: ctx.request.method,
            path: new URL(ctx.request.url).pathname,
            duration: 0,
            headers: hasCustomLog ? Object.fromEntries(ctx.request.headers.entries()) : undefined,
          })
        }
      }
    })
    .onAfterResponse((ctx) => {
      handleLog(ctx, options, getTimestamp, false)
    })
    .onError((ctx) => {
      // Patch: Ensure ctx.query is Record<string, string> (not possibly undefined)
      // and ctx.cookie is Record<string, Cookie<unknown>>
      const patchedCtx = {
        ...ctx,
        query: Object.fromEntries(
          Object.entries(ctx.query || {}).filter(([_, v]) => typeof v === 'string') as [
            string,
            string,
          ][],
        ),
        cookie: Object.fromEntries(
          Object.entries(ctx.cookie || {}).map(([k, v]) => [k, v as Cookie<unknown>]),
        ),
        params: { ...(ctx.params || {}) },
      }
      handleLog(patchedCtx as any, options, getTimestamp, true)
    })
    .as('global')

  // --------------------------------------------------------------------------
  // HELPER LOGIC
  // --------------------------------------------------------------------------

  async function handleLog(
    ctx: Context & { store: any },
    options: LoggerOptions,
    getTimestamp: () => string,
    isError: boolean,
  ) {
    const { request, set, store } = ctx

    // Calculate Duration (now in microseconds)
    const start = store[START_TIME]
    const end = performance.now()
    const durationMs = start ? end - start : 0
    const durationUs = Math.round(durationMs * 1000)

    const url = new URL(request.url)
    const timestamp = options.withTimestamp ? pc.dim(`[${getTimestamp()}]`) : ''
    const status = isError
      ? 'status' in (ctx as any).error
        ? (ctx as any).error.status
        : 500
      : set.status

    // 1. Console Output
    const icon = isError
      ? pc.red('✗')
      : options.mode === 'combined'
        ? pc.green('✓')
        : pc.green('<---')

    console.log(
      [
        timestamp,
        icon,
        pc.bold(fmtMethod(request.method)),
        url.pathname,
        fmtStatus(status),
        pc.dim(`[${fmtDuration(durationUs)}]`),
      ]
        .filter(Boolean)
        .join(' '),
    )

    // 2. Custom Logger Data Collection (Optimization: Only if needed)
    if (options.customLog) {
      const data: LogData = {
        timestamp: getTimestamp(),
        type: 'out',
        method: request.method,
        path: url.pathname,
        duration: durationUs,
        status: Number(status),
        // safely capture headers
        headers: Object.fromEntries(request.headers.entries()),
        query: Object.fromEntries(url.searchParams.entries()),
      }

      // Try to capture body if it exists (Elysia parses it into ctx.body)
      if ('body' in ctx) {
        data.body = ctx.body
      }

      // Capture Cookies
      if ('cookie' in ctx && ctx.cookie) {
        // Elysia 1.0+ cookies are objects
        data.cookies = {}
        for (const [k, v] of Object.entries(ctx.cookie)) {
          data.cookies[k] = (v as any).value
        }
      }

      // Capture Error
      if (isError && 'error' in ctx) {
        data.error = ctx.error
      }

      // Capture Set-Cookies
      const setCookieHeader = set.headers['Set-Cookie'] || set.headers['set-cookie']
      if (setCookieHeader) {
        // Ensure that setCookies is always string[]
        data.setCookies = Array.isArray(setCookieHeader)
          ? (setCookieHeader as string[]).map(String)
          : [String(setCookieHeader)]
      }

      await options.customLog(data)
    }
  }
}
