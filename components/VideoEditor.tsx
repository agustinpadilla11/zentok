
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
    const [textPosition, setTextPosition] = useState({ x: 50, y: 50 }); // Percentage
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);

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
            }
        }
    };

    const handleProcess = async () => {
        if (!videoRef.current || !canvasRef.current) return;
        setIsProcessing(true);

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size to video size
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const stream = canvas.captureStream(30); // 30 FPS

        // Attempt to add audio
        try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const dest = audioCtx.createMediaStreamDestination();
            const source = audioCtx.createMediaElementSource(video);
            source.connect(dest);
            source.connect(audioCtx.destination);

            const audioTrack = dest.stream.getAudioTracks()[0];
            if (audioTrack) {
                stream.addTrack(audioTrack);
            }
        } catch (e) {
            console.warn("Could not capture audio:", e);
        }

        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus' });
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

        const renderFrame = () => {
            if (video.currentTime >= endTime || video.paused || video.ended) {
                recorder.stop();
                video.pause();
                return;
            }

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Draw text
            if (text) {
                ctx.font = `black ${canvas.width / 10}px Outfit, Inter, sans-serif`;
                ctx.fillStyle = 'white';
                ctx.textAlign = 'center';

                // Text Shadow/Stroke
                ctx.strokeStyle = 'black';
                ctx.lineWidth = canvas.width / 100;

                const x = (textPosition.x / 100) * canvas.width;
                const y = (textPosition.y / 100) * canvas.height;

                ctx.strokeText(text.toUpperCase(), x, y);
                ctx.fillText(text.toUpperCase(), x, y);
            }

            requestAnimationFrame(renderFrame);
        };

        renderFrame();
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col p-8 overflow-y-auto hide-scrollbar">
            {/* Header */}
            <div className="flex justify-between items-center mb-10">
                <button onClick={onCancel} className="bg-zinc-900 border border-white/10 p-4 rounded-2xl text-zinc-400 hover:text-white transition-colors">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h2 className="text-2xl font-black uppercase tracking-tighter italic">Edición Zen</h2>
                <button
                    onClick={handleProcess}
                    disabled={isProcessing}
                    className="bg-white text-black px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-50 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10"
                >
                    {isProcessing ? (
                        <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            <span>Procesando</span>
                        </div>
                    ) : 'Siguiente'}
                </button>
            </div>

            <div className="flex-1 flex flex-col md:flex-row gap-12 max-w-5xl mx-auto w-full">
                {/* Preview Area */}
                <div className="relative aspect-[9/16] w-full max-w-[320px] mx-auto bg-zinc-900 rounded-[3rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/5 ring-1 ring-white/10">
                    <video
                        ref={videoRef}
                        src={videoUrl}
                        onTimeUpdate={handleTimeUpdate}
                        playsInline
                        className="w-full h-full object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Text Preview Overlay */}
                    <div
                        className="absolute inset-0 pointer-events-none flex items-center justify-center p-12"
                        style={{ alignItems: textPosition.y > 60 ? 'flex-end' : textPosition.y < 40 ? 'flex-start' : 'center' }}
                    >
                        {text && (
                            <div className="text-white text-4xl font-black text-center drop-shadow-[0_4px_10px_rgba(0,0,0,1)] break-words w-full animate-fade-in uppercase italic tracking-tighter">
                                {text}
                            </div>
                        )}
                    </div>
                </div>

                {/* Controls Area */}
                <div className="flex-1 space-y-10">
                    {/* Trimming Section */}
                    <section className="bg-zinc-900/50 backdrop-blur-md rounded-[2.5rem] p-8 border border-white/5">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="bg-blue-500/20 p-2 rounded-lg"><svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg></div>
                            <label className="text-xs uppercase font-black tracking-widest text-white/50">Recorte de precisión</label>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-3">
                                <div className="flex justify-between text-[10px] font-bold text-white/30 uppercase tracking-widest">
                                    <span>Marca de inicio</span>
                                    <span className="text-blue-500">{startTime.toFixed(1)}s</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max={duration}
                                    step="0.1"
                                    value={startTime}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setStartTime(val);
                                        if (videoRef.current) videoRef.current.currentTime = val;
                                    }}
                                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between text-[10px] font-bold text-white/30 uppercase tracking-widest">
                                    <span>Marca de fin</span>
                                    <span className="text-red-500">{endTime.toFixed(1)}s</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max={duration}
                                    step="0.1"
                                    value={endTime}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setEndTime(val);
                                        if (videoRef.current) videoRef.current.currentTime = val;
                                    }}
                                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-500"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Text Section */}
                    <section className="bg-zinc-900/50 backdrop-blur-md rounded-[2.5rem] p-8 border border-white/5">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="bg-purple-500/20 p-2 rounded-lg"><svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></div>
                            <label className="text-xs uppercase font-black tracking-widest text-white/50">Capas de texto</label>
                        </div>

                        <div className="space-y-6">
                            <input
                                type="text"
                                placeholder="Escribe algo impactante..."
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                className="w-full bg-zinc-800 border border-white/5 rounded-2xl p-5 text-lg font-black placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all uppercase italic"
                            />

                            <div className="grid grid-cols-3 gap-3">
                                <button onClick={() => setTextPosition({ x: 50, y: 20 })} className={`py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${textPosition.y === 20 ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'}`}>Superior</button>
                                <button onClick={() => setTextPosition({ x: 50, y: 50 })} className={`py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${textPosition.y === 50 ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'}`}>Centro</button>
                                <button onClick={() => setTextPosition({ x: 50, y: 80 })} className={`py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${textPosition.y === 80 ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'}`}>Inferior</button>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};
