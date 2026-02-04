
import React, { useRef, useState, useEffect } from 'react';

interface CameraRecorderProps {
    onCapture: (blob: Blob) => void;
    onCancel: () => void;
}

type RecordingState = 'idle' | 'recording' | 'paused' | 'review';
type DurationOption = 30 | 60 | 120; // seconds

export const CameraRecorder: React.FC<CameraRecorderProps> = ({ onCapture, onCancel }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const [recordingState, setRecordingState] = useState<RecordingState>('idle');
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [maxDuration, setMaxDuration] = useState<DurationOption>(120);
    const [recordingTime, setRecordingTime] = useState(0);
    const [segments, setSegments] = useState<Blob[]>([]);
    const timerRef = useRef<number | null>(null);
    const currentChunksRef = useRef<Blob[]>([]);
    const [audioLevel, setAudioLevel] = useState(0);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    useEffect(() => {
        let isMounted = true;

        async function init() {
            try {
                // IMPORTANT: Stop the tracks of the previous stream before requesting a new one
                // This prevents the "camera already in use" or "locked" error on some devices
                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                }

                const constraints = {
                    video: {
                        facingMode: { ideal: facingMode },
                        // Forcing 1080 width and a native mobile aspect ratio to avoid sensor cropping
                        width: { ideal: 1080 },
                        aspectRatio: { ideal: 9 / 19.5 },
                    },
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                    }
                };

                const newStream = await navigator.mediaDevices.getUserMedia(constraints);

                if (isMounted) {
                    setStream(newStream);
                    if (videoRef.current) {
                        videoRef.current.srcObject = newStream;
                        videoRef.current.muted = true;
                    }

                    // Audio Analysis for feedback
                    const audioContext = new AudioContext();
                    const source = audioContext.createMediaStreamSource(newStream);
                    const analyser = audioContext.createAnalyser();
                    analyser.fftSize = 256;
                    source.connect(analyser);

                    audioContextRef.current = audioContext;
                    analyserRef.current = analyser;

                    const dataArray = new Uint8Array(analyser.frequencyBinCount);
                    const updateAudioLevel = () => {
                        if (analyserRef.current) {
                            analyserRef.current.getByteFrequencyData(dataArray);
                            const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
                            setAudioLevel(Math.min(100, (average / 128) * 100));
                            animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
                        }
                    };
                    updateAudioLevel();
                } else {
                    newStream.getTracks().forEach(t => t.stop());
                }
            } catch (err) {
                console.error("Camera access error:", err);
                if (isMounted) {
                    try {
                        const simpleStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                        setStream(simpleStream);
                        if (videoRef.current) videoRef.current.srcObject = simpleStream;
                    } catch (finalErr) {
                        alert("No se pudo acceder a la cámara. Revisa los permisos.");
                    }
                }
            }
        }

        init();

        return () => {
            isMounted = false;
            if (audioContextRef.current) audioContextRef.current.close();
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [facingMode]);

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    };

    const startRecording = () => {
        if (!stream) return;

        currentChunksRef.current = [];
        // Support for more devices with fallbacks
        let options: MediaRecorderOptions = {
            mimeType: 'video/webm;codecs=vp9,opus',
            videoBitsPerSecond: 1200000 // 1.2 Mbps - Balanced fast upload and quality
        };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options = {
                mimeType: 'video/webm;codecs=vp8,opus',
                videoBitsPerSecond: 1200000
            };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options = {
                    mimeType: 'video/mp4',
                    videoBitsPerSecond: 1200000
                };
            }
        }

        const mediaRecorder = new MediaRecorder(stream, options);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                currentChunksRef.current.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            if (currentChunksRef.current.length > 0) {
                const segmentBlob = new Blob(currentChunksRef.current, { type: mediaRecorder.mimeType });
                setSegments(prev => [...prev, segmentBlob]);
            }
        };

        mediaRecorder.start(100); // Small interval for more fluid data capture
        setRecordingState('recording');

        timerRef.current = window.setInterval(() => {
            setRecordingTime(prev => {
                const nextVal = prev + 0.1;
                if (nextVal >= maxDuration) {
                    stopRecording();
                    return maxDuration;
                }
                return nextVal;
            });
        }, 100);
    };

    const pauseRecording = () => {
        if (mediaRecorderRef.current && recordingState === 'recording') {
            mediaRecorderRef.current.stop();
            setRecordingState('paused');
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && (recordingState === 'recording' || recordingState === 'paused')) {
            if (recordingState === 'recording') {
                mediaRecorderRef.current.stop();
            }
            setRecordingState('review');
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const deleteLastSegment = () => {
        if (segments.length > 0) {
            setSegments(prev => prev.slice(0, -1));
            // Rough estimation for UI feedback
            if (segments.length === 1) setRecordingTime(0);
            else setRecordingTime(prev => Math.max(0, prev - 2.5));
        }
    };

    const handleFinish = () => {
        if (segments.length === 0) return;
        const finalType = segments[0].type || 'video/webm';
        const finalBlob = new Blob(segments, { type: finalType });
        stopCamera();
        onCapture(finalBlob);
    };

    const flipCamera = () => {
        // Flipping while recording is usually not supported by single MediaRecorder instances, 
        // so we only flip between segments (paused/idle).
        if (recordingState !== 'recording') {
            setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const progressPercentage = (recordingTime / maxDuration) * 100;

    return (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-between overflow-hidden">
            {/* Camera Feed */}
            <div className="absolute inset-0 w-full h-full bg-zinc-900">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                />
            </div>

            {/* Progress Bar */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-white/20 z-[210]">
                <div
                    className="h-full bg-yellow-400 transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(250,204,21,0.5)]"
                    style={{ width: `${progressPercentage}%` }}
                />
            </div>

            {/* Top UI */}
            <div className="relative z-[220] w-full flex justify-between items-start p-8 pt-12">
                <button
                    onClick={() => { stopCamera(); onCancel(); }}
                    className="text-white bg-black/40 p-3 rounded-full backdrop-blur-xl border border-white/10 active:scale-90 transition-transform"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-2xl font-black text-[10px] tracking-widest flex items-center space-x-3 border border-white/10 uppercase">
                    <div className="flex items-center space-x-1 h-3">
                        {[1, 2, 3].map(i => (
                            <div
                                key={i}
                                className="w-0.5 bg-yellow-400 rounded-full transition-all duration-75"
                                style={{ height: `${Math.max(10, audioLevel * (0.3 + i * 0.2))}%` }}
                            />
                        ))}
                    </div>
                    <div className={`w-1.5 h-1.5 rounded-full ${recordingState === 'recording' ? 'bg-red-600 animate-pulse' : 'bg-white/40'}`} />
                    <span className="text-white">{formatTime(recordingTime)} / {formatTime(maxDuration)}</span>
                </div>

                <button
                    onClick={flipCamera}
                    className="bg-black/40 p-3 rounded-full backdrop-blur-xl border border-white/10 active:scale-95 transition-all flex flex-col items-center group"
                >
                    <svg className="w-6 h-6 text-white group-hover:rotate-180 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>

            {/* Bottom UI */}
            <div className="relative z-[220] w-full flex flex-col items-center space-y-8 pb-12 bg-gradient-to-t from-black/80 to-transparent text-white">

                {/* Duration Selector */}
                {recordingState === 'idle' && (
                    <div className="flex space-x-8 text-[11px] font-black uppercase tracking-widest text-white/40">
                        {([120, 60, 30] as const).map(dur => (
                            <button
                                key={dur}
                                onClick={() => setMaxDuration(dur)}
                                className={`transition-all ${maxDuration === dur ? 'text-white scale-110 border-b-2 border-white pb-1' : ''}`}
                            >
                                {dur === 120 ? '2 min' : dur + ' s'}
                            </button>
                        ))}
                    </div>
                )}

                {/* Main Controls */}
                <div className="flex items-center justify-center w-full px-12 space-x-12">

                    <div className="w-20 h-20 flex flex-col items-center justify-center">
                        {(segments.length > 0 && recordingState !== 'recording') && (
                            <button
                                onClick={deleteLastSegment}
                                className="group flex flex-col items-center"
                            >
                                <div className="bg-zinc-800/80 p-4 rounded-3xl border border-white/10 group-active:scale-90 transition-all">
                                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 002.828 0L21 9" />
                                    </svg>
                                </div>
                                <span className="text-[9px] font-black mt-1 uppercase tracking-widest">Atrás</span>
                            </button>
                        )}
                    </div>

                    <button
                        onClick={recordingState === 'recording' ? pauseRecording : startRecording}
                        className={`w-24 h-24 rounded-full border-[6px] flex items-center justify-center transition-all duration-300 ${recordingState === 'recording' ? 'border-white/40' : 'border-white'
                            }`}
                    >
                        <div className={`transition-all duration-300 ${recordingState === 'recording'
                            ? 'w-10 h-10 bg-red-600 rounded-lg'
                            : recordingState === 'paused'
                                ? 'w-18 h-18 bg-red-600 rounded-full animate-pulse'
                                : 'w-18 h-18 bg-red-600 rounded-full scale-110 shadow-[0_0_30px_rgba(220,38,38,0.5)]'
                            }`} />
                    </button>

                    <div className="w-20 h-20 flex flex-col items-center justify-center">
                        {segments.length > 0 && recordingState !== 'recording' && (
                            <button
                                onClick={handleFinish}
                                className="group flex flex-col items-center"
                            >
                                <div className="bg-yellow-400 p-4 rounded-3xl shadow-[0_0_20px_rgba(250,204,21,0.4)] group-active:scale-95 transition-all text-black">
                                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <span className="text-[9px] font-black mt-1 uppercase tracking-widest">Listo</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
