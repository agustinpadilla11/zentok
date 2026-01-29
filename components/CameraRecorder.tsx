
import React, { useRef, useState, useEffect } from 'react';

interface CameraRecorderProps {
    onCapture: (blob: Blob) => void;
    onCancel: () => void;
}

export const CameraRecorder: React.FC<CameraRecorderProps> = ({ onCapture, onCancel }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [recordingTime, setRecordingTime] = useState(0);
    const timerRef = useRef<number | null>(null);
    const chunksRef = useRef<Blob[]>([]);

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
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode, width: { ideal: 720 }, height: { ideal: 1280 } },
                audio: true
            });
            setStream(newStream);
            if (videoRef.current) {
                videoRef.current.srcObject = newStream;
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            alert("No se pudo acceder a la cámara.");
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    };

    const startRecording = () => {
        if (!stream) return;
        chunksRef.current = [];
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
                chunksRef.current.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            const finalBlob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || 'video/webm' });
            onCapture(finalBlob);
        };

        mediaRecorder.start();
        setIsRecording(true);
        setRecordingTime(0);
        timerRef.current = window.setInterval(() => {
            setRecordingTime(prev => prev + 1);
        }, 1000);
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        }
    };

    const flipCamera = () => {
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-between">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Top UI Overlay */}
            <div className="relative z-10 w-full flex justify-between items-start p-8 pt-12">
                <button
                    onClick={onCancel}
                    className="text-white bg-black/40 p-3 rounded-full backdrop-blur-xl border border-white/10"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {isRecording && (
                    <div className="bg-red-600/90 backdrop-blur-md px-4 py-2 rounded-2xl font-black text-sm tracking-widest flex items-center space-x-2 border border-red-400/50">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        <span>{formatTime(recordingTime)}</span>
                    </div>
                )}

                <div className="flex flex-col space-y-4">
                    <button onClick={flipCamera} className="bg-black/40 p-3 rounded-full backdrop-blur-xl border border-white/10 group flex flex-col items-center">
                        <svg className="w-6 h-6 text-white group-hover:rotate-180 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                    <div className="bg-black/40 p-3 rounded-full backdrop-blur-xl border border-white/10 flex flex-col items-center space-y-4">
                        <div className="w-1 h-1 bg-white/20 rounded-full" />
                        <div className="w-1 h-1 bg-white/40 rounded-full" />
                        <div className="w-1 h-1 bg-white/60 rounded-full" />
                    </div>
                </div>
            </div>

            {/* Bottom UI Overlay */}
            <div className="relative z-10 w-full flex flex-col items-center space-y-8 pb-16 bg-gradient-to-t from-black/80 to-transparent">
                {/* Recording Duration Selector Mockup */}
                <div className="flex space-x-6 text-[11px] font-black uppercase tracking-widest text-white/50">
                    <span>10 min</span>
                    <span className="text-white border-b-2 border-white pb-1">60 s</span>
                    <span>15 s</span>
                </div>

                <div className="flex items-center space-x-12">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl border border-white/20 overflow-hidden backdrop-blur-xl" />

                    <button
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`w-24 h-24 rounded-full border-[6px] flex items-center justify-center transition-all duration-300 ${isRecording ? 'border-white/20' : 'border-white'
                            }`}
                    >
                        <div className={`transition-all duration-300 ${isRecording ? 'w-10 h-10 bg-red-600 rounded-2xl' : 'w-18 h-18 bg-red-600 rounded-full scale-110'
                            }`} />
                    </button>

                    <div className="w-12 h-12 flex flex-col items-center justify-center space-y-1">
                        <div className="w-8 h-8 bg-white/10 rounded-xl border border-white/20 flex items-center justify-center backdrop-blur-xl">
                            <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                        <span className="text-[9px] font-black text-white/50 uppercase tracking-tighter">Cargar</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
