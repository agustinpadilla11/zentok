
import React, { useRef, useState, useEffect } from 'react';

interface CameraRecorderProps {
    onCapture: (blob: Blob) => void;
    onCancel: () => void;
}

type RecordingState = 'idle' | 'recording' | 'paused' | 'review';
type DurationOption = 15 | 60 | 600; // seconds

export const CameraRecorder: React.FC<CameraRecorderProps> = ({ onCapture, onCancel }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const [recordingState, setRecordingState] = useState<RecordingState>('idle');
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [maxDuration, setMaxDuration] = useState<DurationOption>(60);
    const [recordingTime, setRecordingTime] = useState(0);
    const [segments, setSegments] = useState<Blob[]>([]);
    const timerRef = useRef<number | null>(null);
    const currentChunksRef = useRef<Blob[]>([]);

    useEffect(() => {
        startCamera();
        return () => {
            stopCamera();
        };
    }, [facingMode]);

    const startCamera = async () => {
        try {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            // Use more standard constraints to avoid forced zoom
            const constraints = {
                video: {
                    facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: true
            };
            const newStream = await navigator.mediaDevices.getUserMedia(constraints);
            setStream(newStream);
            if (videoRef.current) {
                videoRef.current.srcObject = newStream;
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            alert("No se pudo acceder a la cámara o micrófono.");
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    };

    const startRecording = () => {
        if (!stream) return;

        currentChunksRef.current = [];
        const options = { mimeType: 'video/webm;codecs=vp9,opus' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options.mimeType = 'video/webm;codecs=vp8,opus';
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'video/mp4';
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

        mediaRecorder.start();
        setRecordingState('recording');

        timerRef.current = window.setInterval(() => {
            setRecordingTime(prev => {
                if (prev >= maxDuration) {
                    stopRecording();
                    return prev;
                }
                return prev + 0.1;
            });
        }, 100);
    };

    const pauseRecording = () => {
        if (mediaRecorderRef.current && recordingState === 'recording') {
            mediaRecorderRef.current.stop(); // We stop to save the segment
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
            const lastSegment = segments[segments.length - 1];
            // Roughly estimate time based on segment size or just track it more carefully
            // For simplicity in this demo, we'll just subtract some time or reset if it's the only one
            // Ideally we'd store duration per segment.
            setSegments(prev => prev.slice(0, -1));
            // Reset time roughly (this is a limitation without per-segment metadata)
            if (segments.length === 1) setRecordingTime(0);
            else setRecordingTime(prev => Math.max(0, prev - 5)); // Placeholder logic
        }
    };

    const handleFinish = async () => {
        if (segments.length === 0) return;
        const finalBlob = new Blob(segments, { type: segments[0].type });
        onCapture(finalBlob);
    };

    const flipCamera = () => {
        if (recordingState === 'idle' || recordingState === 'paused' || recordingState === 'review') {
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
                    className="w-full h-full object-contain md:object-cover" // Less "zoom" by default
                />
            </div>

            {/* Progress Bar */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-white/20 z-30">
                <div
                    className="h-full bg-yellow-400 transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(250,204,21,0.5)]"
                    style={{ width: `${progressPercentage}%` }}
                />
            </div>

            {/* Top UI */}
            <div className="relative z-10 w-full flex justify-between items-start p-8 pt-12">
                <button
                    onClick={onCancel}
                    className="text-white bg-black/40 p-3 rounded-full backdrop-blur-xl border border-white/10 active:scale-90 transition-transform"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-2xl font-black text-xs tracking-widest flex items-center space-x-2 border border-white/10">
                    <div className={`w-2 h-2 rounded-full ${recordingState === 'recording' ? 'bg-red-600 animate-pulse' : 'bg-white/40'}`} />
                    <span className="text-white">{formatTime(recordingTime)} / {formatTime(maxDuration)}</span>
                </div>

                <button
                    onClick={flipCamera}
                    className="bg-black/40 p-3 rounded-full backdrop-blur-xl border border-white/10 active:scale-95 transition-all"
                >
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>

            {/* Side Tools (TikTok style) */}
            {recordingState !== 'recording' && (
                <div className="absolute right-8 top-1/2 -translate-y-1/2 z-20 flex flex-col space-y-6">
                    <button className="flex flex-col items-center group">
                        <div className="bg-black/40 p-3 rounded-full backdrop-blur-xl border border-white/10 group-active:scale-90 transition-all">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-tighter mt-1 drop-shadow-md">Filtros</span>
                    </button>
                    <button className="flex flex-col items-center group">
                        <div className="bg-black/40 p-3 rounded-full backdrop-blur-xl border border-white/10 group-active:scale-90 transition-all">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-tighter mt-1 drop-shadow-md">Tiempo</span>
                    </button>
                </div>
            )}

            {/* Bottom UI */}
            <div className="relative z-10 w-full flex flex-col items-center space-y-8 pb-12 bg-gradient-to-t from-black/60 to-transparent">

                {/* Duration Selector */}
                {recordingState === 'idle' && (
                    <div className="flex space-x-8 text-[11px] font-black uppercase tracking-widest text-white/40">
                        <button
                            onClick={() => setMaxDuration(600)}
                            className={`transition-all ${maxDuration === 600 ? 'text-white scale-110 border-b-2 border-white pb-1' : ''}`}
                        >
                            10 min
                        </button>
                        <button
                            onClick={() => setMaxDuration(60)}
                            className={`transition-all ${maxDuration === 60 ? 'text-white scale-110 border-b-2 border-white pb-1' : ''}`}
                        >
                            60 s
                        </button>
                        <button
                            onClick={() => setMaxDuration(15)}
                            className={`transition-all ${maxDuration === 15 ? 'text-white scale-110 border-b-2 border-white pb-1' : ''}`}
                        >
                            15 s
                        </button>
                    </div>
                )}

                {/* Main Controls */}
                <div className="flex items-center justify-center w-full px-12 space-x-12">

                    {/* Delete Segment Button */}
                    <div className="w-16 h-16 flex flex-col items-center justify-center">
                        {(segments.length > 0 && recordingState !== 'recording') && (
                            <button
                                onClick={deleteLastSegment}
                                className="group flex flex-col items-center"
                            >
                                <div className="bg-zinc-800/80 p-3 rounded-2xl border border-white/10 group-active:scale-90 transition-all">
                                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 002.828 0L21 9" />
                                    </svg>
                                </div>
                                <span className="text-[9px] font-bold text-white mt-1 uppercase">Borrar</span>
                            </button>
                        )}
                    </div>

                    {/* Record / Pause Button */}
                    <button
                        onClick={recordingState === 'recording' ? pauseRecording : startRecording}
                        className={`w-24 h-24 rounded-full border-[6px] flex items-center justify-center transition-all duration-300 ${recordingState === 'recording' ? 'border-white/40' : 'border-white'
                            }`}
                    >
                        <div className={`transition-all duration-300 ${recordingState === 'recording'
                                ? 'w-10 h-10 bg-red-600 rounded-lg'
                                : recordingState === 'paused'
                                    ? 'w-18 h-18 bg-red-600 rounded-full animate-pulse'
                                    : 'w-18 h-18 bg-red-600 rounded-full scale-110'
                            }`} />
                    </button>

                    {/* Finish / Review Button */}
                    <div className="w-16 h-16 flex flex-col items-center justify-center">
                        {segments.length > 0 && recordingState !== 'recording' && (
                            <button
                                onClick={handleFinish}
                                className="group flex flex-col items-center"
                            >
                                <div className="bg-green-600 p-4 rounded-full shadow-[0_0_20px_rgba(22,163,74,0.4)] group-active:scale-90 transition-all">
                                    <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <span className="text-[9px] font-bold text-white mt-1 uppercase">Listo</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
