
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { ChevronRight, DownloadCloud, RefreshCw, Clock } from "lucide-react";

interface VideoClip {
  id: string;
  name: string;
  duration: number;
  type: "hook" | "selling-point" | "cta";
}

interface Sequence {
  id: string;
  clips: VideoClip[];
  duration: number;
}

const Index = () => {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(false);

  // Mock video clips data - in real app, this would come from your file system
  const availableClips: VideoClip[] = [
    { id: "1", name: "Hook 1", duration: 2.5, type: "hook" },
    { id: "2", name: "Hook 2", duration: 3.0, type: "hook" },
    { id: "3", name: "Feature 1", duration: 2.0, type: "selling-point" },
    { id: "4", name: "Feature 2", duration: 2.5, type: "selling-point" },
    { id: "5", name: "Feature 3", duration: 3.0, type: "selling-point" },
    { id: "6", name: "CTA 1", duration: 2.0, type: "cta" },
    { id: "7", name: "CTA 2", duration: 2.5, type: "cta" },
  ];

  const generateSequences = useCallback(() => {
    setLoading(true);
    
    // Generate 10 different sequences
    const newSequences: Sequence[] = [];
    
    for (let i = 0; i < 10; i++) {
      // Always include one hook, 1-3 selling points, and one CTA
      const hooks = availableClips.filter(clip => clip.type === "hook");
      const sellingPoints = availableClips.filter(clip => clip.type === "selling-point");
      const ctas = availableClips.filter(clip => clip.type === "cta");
      
      const selectedHook = hooks[Math.floor(Math.random() * hooks.length)];
      const selectedCTA = ctas[Math.floor(Math.random() * ctas.length)];
      
      // Randomly select 1-3 selling points
      const numSellingPoints = Math.floor(Math.random() * 3) + 1;
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
  }, []);

  const exportSequence = useCallback((sequence: Sequence) => {
    // In a real app, this would trigger video processing
    toast.success("Starting export...");
    console.log("Exporting sequence:", sequence);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12 animate-fade-up">
          <h1 className="text-4xl font-bold mb-4 text-gray-900">Video Sequence Generator</h1>
          <p className="text-gray-600 mb-8">Create engaging video sequences from your content clips</p>
          
          <button
            onClick={generateSequences}
            disabled={loading}
            className="inline-flex items-center px-6 py-3 bg-black text-white rounded-lg shadow-sm hover:bg-gray-900 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-5 h-5 mr-2" />
            )}
            Generate Sequences
          </button>
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
