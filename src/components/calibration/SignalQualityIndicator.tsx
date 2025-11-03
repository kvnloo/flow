interface SignalQualityIndicatorProps {
  deviceInfo: {
    signalQuality?: {
      TP9: number;
      AF7: number;
      AF8: number;
      TP10: number;
    };
  };
}

const CHANNELS = [
  { id: 'TP9', name: 'Left Ear (TP9)', position: 'left' },
  { id: 'AF7', name: 'Left Forehead (AF7)', position: 'left' },
  { id: 'AF8', name: 'Right Forehead (AF8)', position: 'right' },
  { id: 'TP10', name: 'Right Ear (TP10)', position: 'right' },
] as const;

export function SignalQualityIndicator({ deviceInfo }: SignalQualityIndicatorProps) {
  const getQualityColor = (quality: number) => {
    if (quality >= 3) return 'bg-green-500';
    if (quality >= 2) return 'bg-yellow-500';
    if (quality >= 1) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getQualityText = (quality: number) => {
    if (quality >= 3) return 'Excellent';
    if (quality >= 2) return 'Good';
    if (quality >= 1) return 'Fair';
    return 'Poor';
  };

  const getQualityValue = (channelId: string): number => {
    if (!deviceInfo.signalQuality) return 2; // Default to "Good"
    return deviceInfo.signalQuality[channelId as keyof typeof deviceInfo.signalQuality] || 2;
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {CHANNELS.map(channel => {
        const quality = getQualityValue(channel.id);
        const qualityPercent = (quality / 4) * 100;

        return (
          <div key={channel.id} className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">{channel.name}</span>
              <span className="text-gray-500">{getQualityText(quality)}</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${getQualityColor(quality)}`}
                style={{ width: `${qualityPercent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
