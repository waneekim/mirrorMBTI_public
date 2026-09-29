import { useCallback, useEffect, useRef, useState } from 'react';
import { classifyMediaError, MEDIA_CONSTRAINTS, type MediaFailure } from './media';

export type MediaStatus = 'idle' | 'requesting' | 'granted' | MediaFailure;

export function useMediaStream() {
  const [status, setStatus] = useState<MediaStatus>('idle');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  const request = useCallback(async () => {
    if (!window.isSecureContext) {
      setStatus('insecure');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setStatus('unsupported');
      return;
    }
    setStatus('requesting');
    try {
      const s = await navigator.mediaDevices.getUserMedia(MEDIA_CONSTRAINTS);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = s;
      setStream(s);
      setStatus('granted');
    } catch (err) {
      setStatus(classifyMediaError(err));
    }
  }, []);

  // If the user re-enables the camera in browser settings, pick it up without a reload.
  useEffect(() => {
    if (status !== 'denied' || !navigator.permissions?.query) return;
    let perm: PermissionStatus | null = null;
    const onChange = () => {
      if (perm?.state === 'granted' || perm?.state === 'prompt') void request();
    };
    navigator.permissions
      .query({ name: 'camera' as PermissionName })
      .then((p) => {
        perm = p;
        p.addEventListener('change', onChange);
      })
      .catch(() => {
        /* Firefox/Safari may not support the camera permission name */
      });
    return () => perm?.removeEventListener('change', onChange);
  }, [status, request]);

  useEffect(() => stop, [stop]);

  return { status, stream, request, stop };
}
