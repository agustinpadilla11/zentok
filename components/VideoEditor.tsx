
import React, { useRef, useState, useEffect } from 'react';

interface VideoEditorProps {
    videoBlob: Blob;
    onSave: (processedBlob: Blob) => void;
    onCancel: () => void;
}

export const VideoEditor: React.FC<VideoEditorProps> = ({ videoBlob, onSave, onCancel }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [startTime, setStartTime] = useState(0);
    const [endTime, setEndTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [text, setText] = useState('');
    const [textPosition, setTextPosition] = useState({ x: 50, y: 50 });
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    const videoUrl = useRef(URL.createObjectURL(videoBlob)).current;

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleLoadedMetadata = () => {
            setDuration(video.duration);
            setEndTime(video.duration);
        };

        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        return () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        };
    }, []);

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
            if (videoRef.current.currentTime >= endTime) {
                videoRef.current.currentTime = startTime;
                if (!isPlaying) videoRef.current.pause();
            }
        }
    };

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) videoRef.current.pause();
            else videoRef.current.play();
            setIsPlaying(!isPlaying);
        }
    };

    const handleProcess = async () => {
        if (!videoRef.current || !canvasRef.current) return;
        setIsProcessing(true);

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Use video actual dimensions for processing
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const stream = canvas.captureStream(30);

        // Capture audio if possible
        let combinedStream = stream;
        try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const source = audioCtx.createMediaElementSource(video);
            const destination = audioCtx.createMediaStreamDestination();
            source.connect(destination);
            source.connect(audioCtx.destination);

            const audioTrack = destination.stream.getAudioTracks()[0];
            if (audioTrack) stream.addTrack(audioTrack);
        } catch (e) { console.warn("Audio capture failed", e); }

        const recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm;codecs=vp9,opus' });
        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = () => {
            const resultBlob = new Blob(chunks, { type: 'video/webm' });
            onSave(resultBlob);
            setIsProcessing(false);
        };

        recorder.start();
        video.currentTime = startTime;
        video.muted = false;
        await video.play();

        const render = () => {
            if (video.currentTime >= endTime || video.paused || video.ended) {
                recorder.stop();
                video.pause();
                return;
            }
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            if (text) {
                ctx.font = `bold ${canvas.width / 12}px "Outfit", system-ui, sans-serif`;
                ctx.fillStyle = 'white';
                ctx.textAlign = 'center';
                ctx.strokeStyle = 'black';
                ctx.lineWidth = canvas.width / 80;
                const x = (textPosition.x / 100) * canvas.width;
                const y = (textPosition.y / 100) * canvas.height;
                ctx.strokeText(text.toUpperCase(), x, y);
                ctx.fillText(text.toUpperCase(), x, y);
            }
            requestAnimationFrame(render);
        };
        render();
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col p-6 overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <button onClick={onCancel} className="text-zinc-500 hover:text-white transition-colors">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <span className="font-black italic uppercase tracking-tighter text-xl">Estudio Zen</span>
                <button
                    onClick={handleProcess}
                    disabled={isProcessing}
                    className="bg-yellow-400 text-black px-6 py-2 rounded-full font-black text-sm uppercase tracking-widest disabled:opacity-50 shadow-[0_0_20px_rgba(250,204,21,0.3)]"
                >
                    {isProcessing ? 'Procesando...' : 'Siguiente'}
                </button>
            </div>

            <div className="flex-1 flex flex-col md:flex-row gap-8 items-center justify-center overflow-y-auto hide-scrollbar">
                {/* Preview Container */}
                <div className="relative aspect-[9/16] w-full max-w-[280px] bg-zinc-900 rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 group">
                    <video
                        ref={videoRef}
                        src={videoUrl}
                        onTimeUpdate={handleTimeUpdate}
                        playsInline
                        className="w-full h-full object-contain" // Fixed zoom issue by using contain
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Play/Pause Overlay */}
                    <button onClick={togglePlay} className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!isPlaying && <div className="bg-white/20 p-4 rounded-full backdrop-blur-md"><svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg></div>}
                    </button>

                    {/* Text Overlay Preview */}
                    <div
                        className="absolute inset-0 pointer-events-none p-8 flex"
                        style={{ alignItems: textPosition.y > 60 ? 'flex-end' : textPosition.y < 40 ? 'flex-start' : 'center', justifyContent: 'center' }}
                    >
                        {text && (
                            <span className="text-white text-3xl font-black text-center drop-shadow-2xl uppercase italic tracking-tighter w-full bg-black/20 backdrop-blur-[2px] py-2">
                                {text}
                            </span>
                        )}
                    </div>
                </div>

                {/* Controls Container */}
                <div className="w-full max-w-sm flex flex-col space-y-8">
                    {/* Trimming */}
                    <div className="bg-zinc-900/80 p-6 rounded-3xl border border-white/5 space-y-6">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Recorte de Escena</span>
                            <span className="text-xs font-mono text-zinc-300">{(endTime - startTime).toFixed(1)}s seleccionados</span>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <div className="flex justify-between text-[9px] font-bold text-yellow-500"><span>INICIO</span><span>{startTime.toFixed(1)}s</span></div>
                                <input type="range" min="0" max={duration} step="0.1" value={startTime} onChange={(e) => { setStartTime(parseFloat(e.target.value)); if (videoRef.current) videoRef.current.currentTime = parseFloat(e.target.value); }} className="w-full h-1 bg-zinc-800 rounded-lg appearance-none accent-yellow-500" />
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-[9px] font-bold text-yellow-500"><span>FIN</span><span>{endTime.toFixed(1)}s</span></div>
                                <input type="range" min="0" max={duration} step="0.1" value={endTime} onChange={(e) => { setEndTime(parseFloat(e.target.value)); if (videoRef.current) videoRef.current.currentTime = parseFloat(e.target.value); }} className="w-full h-1 bg-zinc-800 rounded-lg appearance-none accent-yellow-500" />
                            </div>
                        </div>
                    </div>

                    {/* Text Input */}
                    <div className="bg-zinc-900/80 p-6 rounded-3xl border border-white/5 space-y-4">
                        <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest block">Agregar Mensaje</span>
                        <input
                            type="text"
                            placeholder="ESCRIBE AQUÍ..."
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            className="w-full bg-black/40 border-b-2 border-zinc-800 focus:border-yellow-400 p-3 rounded-t-xl text-lg font-black uppercase italic tracking-tighter outline-none transition-all"
                        />
                        <div className="grid grid-cols-3 gap-2">
                            {[{ l: 'Arriba', v: 20 }, { l: 'Centro', v: 50 }, { l: 'Abajo', v: 80 }].map(pos => (
                                <button key={pos.l} onClick={() => setTextPosition({ x: 50, y: pos.v })} className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${textPosition.y === pos.v ? 'bg-yellow-400 text-black' : 'bg-zinc-800 text-zinc-500'}`}>
                                    {pos.l}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
