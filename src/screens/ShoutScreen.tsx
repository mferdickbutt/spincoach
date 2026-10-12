import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useLocale } from '@/locale/context'
import type { ShoutNotice } from '@/locale/messages'
import { loadJson, saveJson } from '@/lib/storage'

const SHOUT_MAX_SECONDS = 10

export function ShoutScreen() {
  const { lang, say } = useLocale()
  const [clip, setClip] = useState<string | null>(() => loadJson<string | null>('shout', null))
  const [msg, setMsg] = useState<ShoutNotice | null>(null)
  const [recording, setRecording] = useState(false)
  const rec = useRef<MediaRecorder | null>(null)

  async function toggleRecord() {
    if (rec.current && rec.current.state === 'recording') {
      rec.current.stop()
      return
    }
    if (!navigator.mediaDevices || typeof MediaRecorder === 'undefined') {
      setMsg({ kind: 'shout-unsupported' })
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const chunks: BlobPart[] = []
      const recorder = new MediaRecorder(stream)
      rec.current = recorder
      recorder.ondataavailable = (event) => {
        chunks.push(event.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
        const reader = new FileReader()
        reader.onload = () => {
          const data = typeof reader.result === 'string' ? reader.result : null
          setClip(data)
          if (data) {
            saveJson('shout', data)
          }
          setMsg({ kind: 'shout-saved' })
          setRecording(false)
        }
        reader.readAsDataURL(blob)
      }
      recorder.start()
      setRecording(true)
      setMsg({ kind: 'shout-recording', maxSeconds: SHOUT_MAX_SECONDS })
      window.setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop()
        }
      }, SHOUT_MAX_SECONDS * 1000)
    } catch (err) {
      const errorName = err instanceof Error ? err.name : 'Error'
      setMsg({ kind: 'shout-mic', errorName })
    }
  }

  function play() {
    if (!clip) {
      return
    }
    const audio = new Audio(clip)
    void audio.play().catch(() => {
      setMsg({ kind: 'shout-playback-failed' })
    })
  }

  function builtin() {
    if (!window.speechSynthesis) {
      setMsg({ kind: 'shout-speech-unsupported' })
      return
    }
    const utterance = new SpeechSynthesisUtterance(say({ kind: 'countdown-spoken' }))
    utterance.lang = lang
    speechSynthesis.cancel()
    speechSynthesis.speak(utterance)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{say({ kind: 'shout-title' })}</CardTitle>
        <CardDescription>{say({ kind: 'shout-description' })}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Button className="flex-1" size="lg" onClick={() => void toggleRecord()} data-testid="rec-btn">
            {recording ? say({ kind: 'action-stop' }) : say({ kind: 'action-record' })}
          </Button>
          <Button
            className="flex-1"
            size="lg"
            variant="secondary"
            disabled={!clip}
            onClick={play}
            data-testid="play-btn"
          >
            {say({ kind: 'action-play' })}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground" data-testid="rec-msg">
          {msg ? say(msg) : ''}
        </p>
        <Button variant="secondary" className="w-full" size="lg" onClick={builtin} data-testid="tts-btn">
          {say({ kind: 'action-builtin' })}
        </Button>
      </CardContent>
    </Card>
  )
}
