'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import parseLLMJson from '@/lib/jsonParser'
import { cn, generateUUID } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  HiOutlineChatBubbleLeftRight,
  HiOutlineCog6Tooth,
  HiOutlineCalendarDays,
  HiOutlineClock,
  HiOutlineUserGroup,
  HiOutlineMapPin,
  HiOutlineLink,
  HiOutlinePaperAirplane,
  HiOutlineSparkles,
  HiOutlineCheckCircle,
  HiOutlinePlusCircle,
  HiOutlineMagnifyingGlass,
  HiOutlineChevronRight,
  HiOutlineExclamationTriangle,
  HiOutlineInformationCircle,
} from 'react-icons/hi2'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const AGENT_ID = '69a01a5a95ad8ebce61fe0a4'
const AGENT_NAME = 'Calendar Assistant Agent'

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const SAMPLE_MESSAGES: ChatMessage[] = [
  {
    id: 'sample-1',
    role: 'user',
    content: 'Show me my meetings for today',
    timestamp: new Date(),
  },
  {
    id: 'sample-2',
    role: 'assistant',
    content: 'Here are your meetings scheduled for today.',
    timestamp: new Date(),
    action: 'fetch_meetings',
    meetings: [
      {
        title: 'Team Standup',
        start: '2026-02-26T09:00:00',
        end: '2026-02-26T09:30:00',
        attendees: ['alice@example.com', 'bob@example.com'],
        location: 'Conference Room A',
        meetLink: 'https://meet.google.com/abc-defg-hij',
      },
      {
        title: 'Product Review',
        start: '2026-02-26T14:00:00',
        end: '2026-02-26T15:00:00',
        attendees: ['carol@example.com', 'dave@example.com', 'eve@example.com'],
        location: '',
        meetLink: 'https://meet.google.com/xyz-uvwx-rst',
      },
      {
        title: '1:1 with Manager',
        start: '2026-02-26T16:00:00',
        end: '2026-02-26T16:30:00',
        attendees: ['manager@example.com'],
        location: 'Office 302',
        meetLink: '',
      },
    ],
    freeSlots: [],
    createdEvent: null,
  },
  {
    id: 'sample-3',
    role: 'user',
    content: 'Find free slots for tomorrow',
    timestamp: new Date(),
  },
  {
    id: 'sample-4',
    role: 'assistant',
    content: 'I found several free time slots for tomorrow.',
    timestamp: new Date(),
    action: 'find_slots',
    meetings: [],
    freeSlots: [
      { start: '2026-02-27T09:00:00', end: '2026-02-27T10:30:00', duration: '90 min' },
      { start: '2026-02-27T11:00:00', end: '2026-02-27T12:00:00', duration: '60 min' },
      { start: '2026-02-27T13:30:00', end: '2026-02-27T14:00:00', duration: '30 min' },
      { start: '2026-02-27T15:00:00', end: '2026-02-27T17:00:00', duration: '120 min' },
    ],
    createdEvent: null,
  },
  {
    id: 'sample-5',
    role: 'user',
    content: 'Create a meeting with alice@example.com tomorrow at 10:30 AM for 30 minutes titled "Design Sync"',
    timestamp: new Date(),
  },
  {
    id: 'sample-6',
    role: 'assistant',
    content: 'Your meeting has been created successfully.',
    timestamp: new Date(),
    action: 'create_meeting',
    meetings: [],
    freeSlots: [],
    createdEvent: {
      title: 'Design Sync',
      start: '2026-02-27T10:30:00',
      end: '2026-02-27T11:00:00',
      attendees: ['alice@example.com'],
      meetLink: 'https://meet.google.com/new-meet-link',
    },
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Meeting {
  title: string
  start: string
  end: string
  attendees: string[]
  location: string
  meetLink: string
}

interface FreeSlot {
  start: string
  end: string
  duration: string
}

interface CreatedEvent {
  title: string
  start: string
  end: string
  attendees: string[]
  meetLink: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  action?: string
  meetings?: Meeting[]
  freeSlots?: FreeSlot[]
  createdEvent?: CreatedEvent | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatTime(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  } catch {
    return dateStr
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  } catch {
    return dateStr
  }
}

function formatTimeRange(start: string, end: string): string {
  return `${formatTime(start)} - ${formatTime(end)}`
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-1.5">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## '))
          return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# '))
          return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* '))
          return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line))
          return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm leading-relaxed">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold">{part}</strong>
    ) : (
      part
    )
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ErrorBoundary
// ─────────────────────────────────────────────────────────────────────────────

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center flex-shrink-0">
        <HiOutlineCalendarDays className="w-4 h-4 text-white" />
      </div>
      <div className="bg-white/75 backdrop-blur-[16px] border border-white/[0.18] rounded-2xl rounded-tl-md px-4 py-3 shadow-md">
        <div className="flex gap-1.5 items-center h-5">
          <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" />
          <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  )
}

function MeetingCard({ meeting }: { meeting: Meeting }) {
  const hasLocation = !!meeting?.location
  const hasMeetLink = !!meeting?.meetLink
  const attendees = Array.isArray(meeting?.attendees) ? meeting.attendees : []

  return (
    <div className="bg-white/60 backdrop-blur-[12px] border border-white/20 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-foreground truncate">{meeting?.title ?? 'Untitled Meeting'}</h4>
          <div className="flex items-center gap-1.5 mt-1.5 text-muted-foreground">
            <HiOutlineClock className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="text-xs">{formatTimeRange(meeting?.start ?? '', meeting?.end ?? '')}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-muted-foreground">
            <HiOutlineCalendarDays className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="text-xs">{formatDate(meeting?.start ?? '')}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {hasMeetLink && (
            <a
              href={meeting.meetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors"
            >
              <HiOutlineLink className="w-3 h-3" />
              Join
            </a>
          )}
        </div>
      </div>

      {(hasLocation || attendees.length > 0) && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
          {hasLocation && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <HiOutlineMapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-xs">{meeting.location}</span>
            </div>
          )}
          {attendees.length > 0 && (
            <div className="flex items-start gap-1.5 text-muted-foreground">
              <HiOutlineUserGroup className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <div className="flex flex-wrap gap-1">
                {attendees.map((a, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0 font-normal bg-slate-100 text-slate-600">
                    {a}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function FreeSlotChip({ slot, onClick }: { slot: FreeSlot; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl px-3 py-2 text-xs font-medium transition-colors cursor-pointer"
    >
      <HiOutlineClock className="w-3.5 h-3.5" />
      <span>{formatTimeRange(slot?.start ?? '', slot?.end ?? '')}</span>
      {slot?.duration && (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-300 text-emerald-600">
          {slot.duration}
        </Badge>
      )}
    </button>
  )
}

function CreatedEventCard({ event }: { event: CreatedEvent }) {
  const attendees = Array.isArray(event?.attendees) ? event.attendees : []
  const hasMeetLink = !!event?.meetLink

  return (
    <div className="bg-emerald-50/80 backdrop-blur-[12px] border border-emerald-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <HiOutlineCheckCircle className="w-5 h-5 text-emerald-600" />
        <span className="text-sm font-semibold text-emerald-800">Event Created</span>
      </div>
      <div className="space-y-2">
        <h4 className="font-semibold text-sm text-foreground">{event?.title ?? 'Untitled Event'}</h4>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <HiOutlineClock className="w-3.5 h-3.5" />
          <span className="text-xs">{formatTimeRange(event?.start ?? '', event?.end ?? '')}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <HiOutlineCalendarDays className="w-3.5 h-3.5" />
          <span className="text-xs">{formatDate(event?.start ?? '')}</span>
        </div>
        {attendees.length > 0 && (
          <div className="flex items-start gap-1.5 text-muted-foreground">
            <HiOutlineUserGroup className="w-3.5 h-3.5 mt-0.5" />
            <div className="flex flex-wrap gap-1">
              {attendees.map((a, i) => (
                <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0 font-normal bg-emerald-100 text-emerald-700">
                  {a}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {hasMeetLink && (
          <a
            href={event.meetLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors mt-1"
          >
            <HiOutlineLink className="w-3.5 h-3.5" />
            Google Meet Link
          </a>
        )}
      </div>
    </div>
  )
}

function AgentBubble({ message }: { message: ChatMessage }) {
  const meetings = Array.isArray(message?.meetings) ? message.meetings : []
  const freeSlots = Array.isArray(message?.freeSlots) ? message.freeSlots : []
  const createdEvent = message?.createdEvent
  const hasCreatedEvent = createdEvent && createdEvent.title

  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center flex-shrink-0">
        <HiOutlineCalendarDays className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0 space-y-3">
        <div className="bg-white/75 backdrop-blur-[16px] border border-white/[0.18] rounded-2xl rounded-tl-md px-4 py-3 shadow-md max-w-[90%]">
          {renderMarkdown(message?.content ?? '')}
        </div>

        {meetings.length > 0 && (
          <div className="space-y-2 max-w-[90%]">
            {meetings.map((m, i) => (
              <MeetingCard key={i} meeting={m} />
            ))}
          </div>
        )}

        {freeSlots.length > 0 && (
          <div className="flex flex-wrap gap-2 max-w-[90%]">
            {freeSlots.map((s, i) => (
              <FreeSlotChip key={i} slot={s} />
            ))}
          </div>
        )}

        {hasCreatedEvent && <CreatedEventCard event={createdEvent} />}
      </div>
    </div>
  )
}

function UserBubble({ message }: { message: ChatMessage }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 justify-end">
      <div className="bg-slate-800 text-white rounded-2xl rounded-tr-md px-4 py-3 shadow-md max-w-[75%]">
        <p className="text-sm leading-relaxed">{message?.content ?? ''}</p>
      </div>
    </div>
  )
}

function WelcomeScreen() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center mx-auto shadow-lg">
          <HiOutlineCalendarDays className="w-8 h-8 text-white" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground tracking-tight">Welcome to CalendarPilot</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your smart calendar assistant. I can help you view upcoming meetings, find open time slots, and schedule new events. Use the quick actions below or type your request to get started.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 text-left">
          <div className="flex items-center gap-3 p-3 bg-white/50 backdrop-blur-[8px] border border-white/20 rounded-xl">
            <HiOutlineMagnifyingGlass className="w-5 h-5 text-slate-500 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-foreground">View Meetings</p>
              <p className="text-[11px] text-muted-foreground">See your schedule at a glance</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white/50 backdrop-blur-[8px] border border-white/20 rounded-xl">
            <HiOutlineClock className="w-5 h-5 text-slate-500 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-foreground">Find Free Slots</p>
              <p className="text-[11px] text-muted-foreground">Identify openings in your calendar</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white/50 backdrop-blur-[8px] border border-white/20 rounded-xl">
            <HiOutlinePlusCircle className="w-5 h-5 text-slate-500 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-foreground">Create Events</p>
              <p className="text-[11px] text-muted-foreground">Schedule meetings with ease</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────────────────────────

export default function Page() {
  // Settings state
  const [workingHoursStart, setWorkingHoursStart] = useState('09:00')
  const [workingHoursEnd, setWorkingHoursEnd] = useState('18:00')
  const [workingDays, setWorkingDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
  const [defaultDuration, setDefaultDuration] = useState('30')
  const [autoAddMeet, setAutoAddMeet] = useState(true)

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Welcome to CalendarPilot! I\'m your smart calendar assistant. I can help you view meetings, find free slots, and create events. Try the quick actions below or type your request.',
      timestamp: new Date(),
      action: 'general',
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activeView, setActiveView] = useState<'chat' | 'settings'>('chat')
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [showSampleData, setShowSampleData] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [settingsSaved, setSettingsSaved] = useState(false)

  const [userId] = useState(() => generateUUID())
  const [sessionId] = useState(() => generateUUID())

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  // Display messages: use sample data or real messages
  const displayMessages = showSampleData ? SAMPLE_MESSAGES : messages

  const sendMessage = useCallback(async (userMessage: string) => {
    if (!userMessage.trim() || isLoading) return

    setErrorMsg(null)
    const userMsg: ChatMessage = {
      id: generateUUID(),
      role: 'user',
      content: userMessage.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)
    setActiveAgentId(AGENT_ID)

    try {
      const settingsContext = `[User Settings: Working hours ${workingHoursStart}-${workingHoursEnd}, Working days: ${workingDays.join(', ')}, Default meeting duration: ${defaultDuration} min, Auto-add Google Meet: ${autoAddMeet ? 'Yes' : 'No'}]\n\n`
      const fullMessage = settingsContext + userMessage.trim()

      const result = await callAIAgent(fullMessage, AGENT_ID, {
        user_id: userId,
        session_id: sessionId,
      })

      if (result.success) {
        // Multi-layer parsing: try result.response.result first, then raw_response, then response itself
        const rawResult = result?.response?.result || {}
        let parsed: Record<string, unknown> | null = null

        // Attempt 1: Parse via parseLLMJson from result
        try {
          const p = parseLLMJson(rawResult)
          if (p && typeof p === 'object' && !Array.isArray(p)) {
            parsed = p as Record<string, unknown>
          }
        } catch {
          // Continue to fallback
        }

        // Attempt 2: If parsed is empty or missing key fields, try raw_response
        if (!parsed || (!parsed.action && !parsed.message && !parsed.meetings)) {
          try {
            const rawStr = result?.raw_response
            if (rawStr && typeof rawStr === 'string') {
              const p2 = parseLLMJson(rawStr)
              if (p2 && typeof p2 === 'object' && !Array.isArray(p2)) {
                // Check if this has more useful data
                const p2Obj = p2 as Record<string, unknown>
                if (p2Obj.action || p2Obj.message || p2Obj.meetings) {
                  parsed = p2Obj
                }
              }
            }
          } catch {
            // Continue
          }
        }

        // Attempt 3: Use rawResult directly if it has the right shape
        if (!parsed || typeof parsed !== 'object') {
          parsed = rawResult as Record<string, unknown>
        }

        // Extract fields with robust fallbacks
        const action = (parsed?.action as string) || 'general'

        // Message extraction: try multiple paths
        let agentMessage = ''
        if (typeof parsed?.message === 'string' && parsed.message) {
          agentMessage = parsed.message
        } else if (typeof result?.response?.message === 'string' && result.response.message) {
          agentMessage = result.response.message
        } else if (typeof (rawResult as Record<string, unknown>)?.text === 'string') {
          agentMessage = (rawResult as Record<string, unknown>).text as string
        } else if (typeof (rawResult as Record<string, unknown>)?.response === 'string') {
          agentMessage = (rawResult as Record<string, unknown>).response as string
        } else if (typeof rawResult === 'string') {
          agentMessage = rawResult
        } else {
          agentMessage = 'Response received.'
        }

        // Parse meetings with safety
        const rawMeetings = parsed?.meetings
        const meetings: Meeting[] = Array.isArray(rawMeetings)
          ? rawMeetings.map((m: Record<string, unknown>) => ({
              title: String(m?.title ?? ''),
              start: String(m?.start ?? ''),
              end: String(m?.end ?? ''),
              attendees: Array.isArray(m?.attendees) ? (m.attendees as string[]).map(String) : [],
              location: String(m?.location ?? ''),
              meetLink: String(m?.meetLink ?? m?.meet_link ?? ''),
            }))
          : []

        // Parse free slots with safety
        const rawSlots = parsed?.freeSlots ?? parsed?.free_slots
        const freeSlots: FreeSlot[] = Array.isArray(rawSlots)
          ? rawSlots.map((s: Record<string, unknown>) => ({
              start: String(s?.start ?? ''),
              end: String(s?.end ?? ''),
              duration: String(s?.duration ?? ''),
            }))
          : []

        // Parse created event with safety
        const rawEvent = (parsed?.createdEvent ?? parsed?.created_event) as Record<string, unknown> | null
        const createdEvent: CreatedEvent | null =
          rawEvent && String(rawEvent?.title ?? '')
            ? {
                title: String(rawEvent.title ?? ''),
                start: String(rawEvent.start ?? ''),
                end: String(rawEvent.end ?? ''),
                attendees: Array.isArray(rawEvent?.attendees) ? (rawEvent.attendees as string[]).map(String) : [],
                meetLink: String(rawEvent.meetLink ?? rawEvent.meet_link ?? ''),
              }
            : null

        const assistantMsg: ChatMessage = {
          id: generateUUID(),
          role: 'assistant',
          content: agentMessage,
          timestamp: new Date(),
          action,
          meetings,
          freeSlots,
          createdEvent,
        }

        setMessages(prev => [...prev, assistantMsg])
      } else {
        // Handle error response gracefully -- show in chat, not as a blocking error
        const errText = result?.error || result?.response?.message || 'An error occurred. Please try again.'
        const errorAssistantMsg: ChatMessage = {
          id: generateUUID(),
          role: 'assistant',
          content: `I encountered an issue processing your request. ${typeof errText === 'string' ? errText : 'Please try again.'}`,
          timestamp: new Date(),
          action: 'general',
        }
        setMessages(prev => [...prev, errorAssistantMsg])
      }
    } catch (err) {
      const errText = err instanceof Error ? err.message : 'Network error'
      const errorAssistantMsg: ChatMessage = {
        id: generateUUID(),
        role: 'assistant',
        content: `Something went wrong while processing your request. Please try again. (${errText})`,
        timestamp: new Date(),
        action: 'general',
      }
      setMessages(prev => [...prev, errorAssistantMsg])
    } finally {
      setIsLoading(false)
      setActiveAgentId(null)
    }
  }, [isLoading, workingHoursStart, workingHoursEnd, workingDays, defaultDuration, autoAddMeet, userId, sessionId])

  const handleQuickAction = (text: string) => {
    if (showSampleData) return
    sendMessage(text)
  }

  const handleSaveSettings = () => {
    setSettingsSaved(true)
    setTimeout(() => setSettingsSaved(false), 2000)
  }

  const toggleDay = (day: string) => {
    setWorkingDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  return (
    <ErrorBoundary>
      <TooltipProvider>
        <div className="h-screen flex bg-gradient-to-br from-[hsl(210,20%,97%)] via-[hsl(220,25%,95%)] to-[hsl(200,20%,96%)] text-foreground font-sans">
          {/* ── Sidebar ── */}
          <aside className="w-16 md:w-60 flex flex-col border-r border-slate-200/60 bg-white/40 backdrop-blur-[16px]">
            {/* Brand */}
            <div className="h-16 flex items-center gap-2.5 px-3 md:px-5 border-b border-slate-200/60">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center flex-shrink-0 shadow-md">
                <HiOutlineCalendarDays className="w-5 h-5 text-white" />
              </div>
              <span className="hidden md:block text-base font-semibold text-foreground tracking-tight">CalendarPilot</span>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-2 md:px-3 py-4 space-y-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setActiveView('chat')}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                      activeView === 'chat'
                        ? 'bg-white/80 shadow-md text-foreground'
                        : 'text-muted-foreground hover:bg-white/40 hover:text-foreground'
                    )}
                  >
                    <HiOutlineChatBubbleLeftRight className="w-5 h-5 flex-shrink-0" />
                    <span className="hidden md:block">Chat</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="md:hidden">Chat</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setActiveView('settings')}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                      activeView === 'settings'
                        ? 'bg-white/80 shadow-md text-foreground'
                        : 'text-muted-foreground hover:bg-white/40 hover:text-foreground'
                    )}
                  >
                    <HiOutlineCog6Tooth className="w-5 h-5 flex-shrink-0" />
                    <span className="hidden md:block">Settings</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="md:hidden">Settings</TooltipContent>
              </Tooltip>
            </nav>

            {/* Agent Status */}
            <div className="px-2 md:px-3 pb-4">
              <div className="bg-white/60 backdrop-blur-[12px] border border-white/20 rounded-xl p-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className={cn('w-2 h-2 rounded-full flex-shrink-0', activeAgentId ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300')} />
                  <span className="hidden md:block text-[11px] text-muted-foreground truncate">{AGENT_NAME}</span>
                </div>
                <p className="hidden md:block text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
                  {activeAgentId ? 'Processing...' : 'Ready'}
                </p>
              </div>
            </div>
          </aside>

          {/* ── Main Content ── */}
          <main className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <header className="h-16 flex items-center justify-between px-6 border-b border-slate-200/60 bg-white/30 backdrop-blur-[16px]">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground font-medium">CalendarPilot</span>
                <HiOutlineChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-semibold text-foreground capitalize">{activeView}</span>
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="sample-toggle" className="text-xs text-muted-foreground cursor-pointer select-none">Sample Data</Label>
                <Switch
                  id="sample-toggle"
                  checked={showSampleData}
                  onCheckedChange={setShowSampleData}
                />
              </div>
            </header>

            {activeView === 'chat' ? (
              /* ── Chat View ── */
              <div className="flex-1 flex flex-col min-h-0">
                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto">
                  {displayMessages.length <= 1 && !showSampleData ? (
                    <WelcomeScreen />
                  ) : (
                    <div className="py-4 space-y-1">
                      {displayMessages.map((msg) =>
                        msg.role === 'user' ? (
                          <UserBubble key={msg.id} message={msg} />
                        ) : (
                          <AgentBubble key={msg.id} message={msg} />
                        )
                      )}
                      {isLoading && <TypingIndicator />}
                    </div>
                  )}
                </div>

                {/* Error banner */}
                {errorMsg && !isLoading && (
                  <div className="mx-4 mb-2 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-xs text-red-700">
                    <HiOutlineExclamationTriangle className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1">{errorMsg}</span>
                    <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-600 font-medium">Dismiss</button>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="px-4 pb-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => handleQuickAction('Show me my meetings for today')}
                    disabled={isLoading || showSampleData}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/70 backdrop-blur-[8px] border border-slate-200 text-xs font-medium text-slate-600 hover:bg-white hover:shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <HiOutlineCalendarDays className="w-3.5 h-3.5" />
                    Show today&apos;s meetings
                  </button>
                  <button
                    onClick={() => handleQuickAction('Find free slots for tomorrow')}
                    disabled={isLoading || showSampleData}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/70 backdrop-blur-[8px] border border-slate-200 text-xs font-medium text-slate-600 hover:bg-white hover:shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <HiOutlineMagnifyingGlass className="w-3.5 h-3.5" />
                    Find free slots
                  </button>
                  <button
                    onClick={() => handleQuickAction('Help me create a new meeting')}
                    disabled={isLoading || showSampleData}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/70 backdrop-blur-[8px] border border-slate-200 text-xs font-medium text-slate-600 hover:bg-white hover:shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <HiOutlinePlusCircle className="w-3.5 h-3.5" />
                    Create meeting
                  </button>
                </div>

                {/* Input Bar */}
                <div className="px-4 pb-4">
                  <div className="flex items-center gap-2 bg-white/75 backdrop-blur-[16px] border border-white/[0.18] rounded-2xl shadow-lg p-2">
                    <Input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          sendMessage(input)
                        }
                      }}
                      placeholder="Ask about your calendar..."
                      disabled={isLoading || showSampleData}
                      className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 text-sm placeholder:text-slate-400"
                    />
                    <Button
                      onClick={() => sendMessage(input)}
                      disabled={isLoading || !input.trim() || showSampleData}
                      size="sm"
                      className="rounded-xl h-9 w-9 p-0 bg-slate-800 hover:bg-slate-700 text-white shadow-md"
                    >
                      {isLoading ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <HiOutlinePaperAirplane className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* ── Settings View ── */
              <ScrollArea className="flex-1">
                <div className="max-w-2xl mx-auto p-6 space-y-6">
                  {/* Working Hours */}
                  <Card className="bg-white/75 backdrop-blur-[16px] border-white/[0.18] shadow-md rounded-2xl">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <HiOutlineClock className="w-5 h-5 text-slate-500" />
                        Working Hours
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-muted-foreground">Start Time</Label>
                          <Input
                            type="time"
                            value={workingHoursStart}
                            onChange={(e) => setWorkingHoursStart(e.target.value)}
                            className="rounded-xl bg-white/60 border-slate-200"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-muted-foreground">End Time</Label>
                          <Input
                            type="time"
                            value={workingHoursEnd}
                            onChange={(e) => setWorkingHoursEnd(e.target.value)}
                            className="rounded-xl bg-white/60 border-slate-200"
                          />
                        </div>
                      </div>

                      <Separator className="bg-slate-100" />

                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">Working Days</Label>
                        <div className="flex flex-wrap gap-2">
                          {ALL_DAYS.map((day) => (
                            <button
                              key={day}
                              onClick={() => toggleDay(day)}
                              className={cn(
                                'px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 border',
                                workingDays.includes(day)
                                  ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                                  : 'bg-white/60 text-slate-500 border-slate-200 hover:bg-slate-50'
                              )}
                            >
                              {day}
                            </button>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Meeting Preferences */}
                  <Card className="bg-white/75 backdrop-blur-[16px] border-white/[0.18] shadow-md rounded-2xl">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <HiOutlineSparkles className="w-5 h-5 text-slate-500" />
                        Meeting Preferences
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">Default Duration</Label>
                        <Select value={defaultDuration} onValueChange={setDefaultDuration}>
                          <SelectTrigger className="rounded-xl bg-white/60 border-slate-200">
                            <SelectValue placeholder="Select duration" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 minutes</SelectItem>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="45">45 minutes</SelectItem>
                            <SelectItem value="60">60 minutes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Separator className="bg-slate-100" />

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-medium text-foreground">Auto-add Google Meet</Label>
                          <p className="text-[11px] text-muted-foreground">Automatically add a Meet link to new events</p>
                        </div>
                        <Switch
                          checked={autoAddMeet}
                          onCheckedChange={setAutoAddMeet}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Save */}
                  <Button
                    onClick={handleSaveSettings}
                    className="w-full rounded-xl h-11 bg-slate-800 hover:bg-slate-700 text-white font-medium shadow-md"
                  >
                    {settingsSaved ? (
                      <span className="flex items-center gap-2">
                        <HiOutlineCheckCircle className="w-4 h-4" />
                        Settings Saved
                      </span>
                    ) : (
                      'Save Settings'
                    )}
                  </Button>

                  {/* Info */}
                  <div className="flex items-start gap-2.5 p-4 bg-blue-50/60 border border-blue-100 rounded-xl">
                    <HiOutlineInformationCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700 leading-relaxed">
                      These settings are included as context when you interact with the calendar assistant. They help the agent understand your availability and preferences for scheduling.
                    </p>
                  </div>

                  {/* Agent Info */}
                  <Card className="bg-white/60 backdrop-blur-[12px] border-white/[0.18] shadow-sm rounded-2xl">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', activeAgentId ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300')} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground">{AGENT_NAME}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Calendar management, event scheduling, free slot detection
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500">
                          {activeAgentId ? 'Active' : 'Idle'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            )}
          </main>
        </div>
      </TooltipProvider>
    </ErrorBoundary>
  )
}
