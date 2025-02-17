import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { ChevronRight, DownloadCloud, RefreshCw, Clock, Upload, X } from "lucide-react";
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

interface VideoClip {
  id: string;
  name: string;
  duration: number;
  type: "hook" | "selling-point" | "cta";
  file?: File;
}

interface Sequence {
  id: string;
  clips: VideoClip[];
  duration: number;
}

const Index = () => {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(false);
  const [ffmpegLoading, setFfmpegLoading] = useState(true);
  const [availableClips, setAvailableClips] = useState<VideoClip[]>([]);
  const [ffmpeg, setFFmpeg] = useState<FFmpeg | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const initFFmpeg = async () => {
      try {
        setFfmpegLoading(true);
        const ffmpegInstance = new FFmpeg();
        
        // Load FFmpeg with log messages
        ffmpegInstance.on('log', ({ message }) => {
          console.log('FFmpeg log:', message);
        });

        await ffmpegInstance.load();
        setFFmpeg(ffmpegInstance);
        setFfmpegLoading(false);
        toast.success('Video processing initialized');
      } catch (error) {
        console.error('Error initializing FFmpeg:', error);
        toast.error('Failed to initialize video processing');
        setFfmpegLoading(false);
      }
    };

    initFFmpeg();
  }, []);

  const detectClipType = (filename: string): VideoClip['type'] => {
    const lowercaseFilename = filename.toLowerCase();
    
    if (lowercaseFilename.includes('hook')) {
      return 'hook';
    }
    if (lowercaseFilename.includes('cta') || lowercaseFilename.includes('call to action')) {
      return 'cta';
    }
    if (lowercaseFilename.includes('selling point') || lowercaseFilename.includes('sp')) {
      return 'selling-point';
    }
    
    return 'selling-point'; // default type
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (ffmpegLoading || !ffmpeg) {
      toast.error('Please wait for video processing to initialize');
      return;
    }

    const files = event.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      // Create a video element to get duration
      const video = document.createElement('video');
      video.preload = 'metadata';

      const promise = new Promise<number>((resolve) => {
        video.onloadedmetadata = () => {
          resolve(video.duration);
          URL.revokeObjectURL(video.src);
        };
      });

      video.src = URL.createObjectURL(file);
      const duration = await promise;

      // Auto-detect clip type from filename
      const detectedType = detectClipType(file.name);

      const newClip: VideoClip = {
        id: `clip-${Date.now()}-${Math.random()}`,
        name: file.name.split('.')[0],
        duration,
        type: detectedType,
        file
      };

      setAvailableClips(prev => [...prev, newClip]);
      toast.success(`Uploaded ${file.name} as ${detectedType}`);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const updateClipType = (clipId: string, newType: VideoClip['type']) => {
    setAvailableClips(prev =>
      prev.map(clip =>
        clip.id === clipId ? { ...clip, type: newType } : clip
      )
    );
  };

  const removeClip = (clipId: string) => {
    setAvailableClips(prev => prev.filter(clip => clip.id !== clipId));
    toast.success("Clip removed");
  };

  const removeAllClips = () => {
    setAvailableClips([]);
    toast.success("All clips removed");
  };

  const generateSequences = useCallback(() => {
    if (availableClips.length === 0) {
      toast.error("Please upload some video clips first");
      return;
    }

    const hooks = availableClips.filter(clip => clip.type === "hook");
    const sellingPoints = availableClips.filter(clip => clip.type === "selling-point");
    const ctas = availableClips.filter(clip => clip.type === "cta");

    if (hooks.length === 0 || ctas.length === 0) {
      toast.error("You need at least one hook and one CTA clip");
      return;
    }

    setLoading(true);
    
    // Generate 10 different sequences
    const newSequences: Sequence[] = [];
    
    for (let i = 0; i < 10; i++) {
      const selectedHook = hooks[Math.floor(Math.random() * hooks.length)];
      const selectedCTA = ctas[Math.floor(Math.random() * ctas.length)];
      
      // Randomly select 1-3 selling points if available
      const numSellingPoints = Math.min(
        Math.floor(Math.random() * 3) + 1,
        sellingPoints.length
      );
      const shuffledSellingPoints = [...sellingPoints].sort(() => Math.random() - 0.5);
      const selectedSellingPoints = shuffledSellingPoints.slice(0, numSellingPoints);
      
      const sequenceClips = [
        selectedHook,
        ...selectedSellingPoints,
        selectedCTA
      ];
      
      const totalDuration = sequenceClips.reduce((acc, clip) => acc + clip.duration, 0);
      
      newSequences.push({
        id: `sequence-${i}`,
        clips: sequenceClips,
        duration: totalDuration
      });
    }
    
    setSequences(newSequences);
    setLoading(false);
    toast.success("Generated new sequences!");
  }, [availableClips]);

  const exportSequence = useCallback(async (sequence: Sequence) => {
    if (ffmpegLoading || !ffmpeg) {
      toast.error('Please wait for video processing to initialize');
      return;
    }

    try {
      setLoading(true);
      toast.success("Starting export...");

      // Create a list file for concatenation
      let listFileContent = '';
      
      // First, write all video files to FFmpeg's virtual filesystem
      for (let i = 0; i < sequence.clips.length; i++) {
        const clip = sequence.clips[i];
        if (!clip.file) {
          throw new Error(`Missing file for clip: ${clip.name}`);
        }

        // Write the file to FFmpeg's virtual filesystem
        const inputData = await fetchFile(clip.file);
        await ffmpeg.writeFile(`input${i}.mp4`, inputData);
        
        // Add entry to the list file
        listFileContent += `file input${i}.mp4\n`;
      }

      // Write the list file
      await ffmpeg.writeFile('list.txt', listFileContent);

      // Concatenate all videos
      await ffmpeg.exec([
        '-f', 'concat',
        '-safe', '0',
        '-i', 'list.txt',
        '-c', 'copy',
        'output.mp4'
      ]);

      // Read the output file
      const outputData = await ffmpeg.readFile('output.mp4');
      
      // Create a download link
      const blob = new Blob([outputData], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sequence-${sequence.id}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Clean up files from FFmpeg's virtual filesystem
      for (let i = 0; i < sequence.clips.length; i++) {
        await ffmpeg.deleteFile(`input${i}.mp4`);
      }
      await ffmpeg.deleteFile('list.txt');
      await ffmpeg.deleteFile('output.mp4');

      toast.success("Export completed!");
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Failed to export sequence");
    } finally {
      setLoading(false);
    }
  }, [ffmpeg, ffmpegLoading]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12 animate-fade-up">
          <h1 className="text-4xl font-bold mb-4 text-gray-900">Video Sequence Generator</h1>
          <p className="text-gray-600 mb-8">Create engaging video sequences from your content clips</p>
          
          <div className="mb-8">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="video/*"
              multiple
              className="hidden"
              disabled={ffmpegLoading}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-900 rounded-lg shadow-sm hover:bg-gray-200 transition-colors mr-4 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={ffmpegLoading}
            >
              {ffmpegLoading ? (
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Upload className="w-5 h-5 mr-2" />
              )}
              {ffmpegLoading ? 'Initializing...' : 'Upload Videos'}
            </button>
            
            <button
              onClick={generateSequences}
              disabled={loading || ffmpegLoading}
              className="inline-flex items-center px-6 py-3 bg-black text-white rounded-lg shadow-sm hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-5 h-5 mr-2" />
              )}
              Generate Sequences
            </button>
          </div>

          {/* Uploaded Clips Section */}
          {availableClips.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-sm mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Uploaded Clips</h2>
                <button
                  onClick={removeAllClips}
                  className="text-sm px-3 py-1 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  Delete All
                </button>
              </div>
              <div className="grid gap-4">
                {availableClips.map((clip) => (
                  <div key={clip.id} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <span className="text-sm font-medium">{clip.name}</span>
                      <span className="text-sm text-gray-500">({clip.duration.toFixed(1)}s)</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <select
                        value={clip.type}
                        onChange={(e) => updateClipType(clip.id, e.target.value as VideoClip['type'])}
                        className="text-sm rounded-md border-gray-300 py-1"
                      >
                        <option value="hook">Hook</option>
                        <option value="selling-point">Selling Point</option>
                        <option value="cta">CTA</option>
                      </select>
                      <button
                        onClick={() => removeClip(clip.id)}
                        className="text-gray-500 hover:text-red-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-6 animate-fade-in">
          {sequences.map((sequence) => (
            <div
              key={sequence.id}
              className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {sequence.duration.toFixed(1)}s
                  </span>
                </div>
                <button
                  onClick={() => exportSequence(sequence)}
                  className="inline-flex items-center px-4 py-2 text-sm bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <DownloadCloud className="w-4 h-4 mr-2" />
                  Export
                </button>
              </div>
              
              <div className="flex items-center space-x-2">
                {sequence.clips.map((clip, index) => (
                  <div key={clip.id} className="flex items-center">
                    <div
                      className={`px-3 py-2 rounded-lg text-sm ${
                        clip.type === "hook"
                          ? "bg-rose-100 text-rose-700"
                          : clip.type === "selling-point"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-violet-100 text-violet-700"
                      }`}
                    >
                      {clip.name}
                    </div>
                    {index < sequence.clips.length - 1 && (
                      <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;
